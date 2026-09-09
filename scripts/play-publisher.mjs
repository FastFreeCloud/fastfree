import { google } from 'googleapis';
import { readFileSync, existsSync, createReadStream, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = val;
    }
  }
  return args;
}

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

const args = parseArgs(process.argv);

const packageName = args.package || fail('--package is required (e.g. com.fastfree.pos)');
const locales = (args.locales || 'ar').split(',').map((l) => l.trim());
const metadataDir = args.metadataDir || fail('--metadata-dir is required');
const track = args.track || 'internal';
const status = args.status || 'draft';
const changesNotSentForReview = args['changes-not-sent-for-review'] !== 'false';
const aabPath = args.aab ? resolve(args.aab) : null;
const versionCodeArg = args['version-code'] || null;

const b64Json = process.env.PLAY_SERVICE_ACCOUNT_JSON;
if (!b64Json) fail('PLAY_SERVICE_ACCOUNT_JSON env var (base64-encoded service account JSON) is required');

let credentials;
try {
  credentials = JSON.parse(Buffer.from(b64Json, 'base64').toString('utf-8'));
} catch {
  fail('Failed to decode/parse PLAY_SERVICE_ACCOUNT_JSON');
}

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

const androidpublisher = google.androidpublisher({ version: 'v3', auth });

function safeReadFile(filePath) {
  if (!existsSync(filePath)) return null;
  return readFileSync(filePath, 'utf-8').trim();
}

let editId = null;

try {
  console.log(`Creating edit for ${packageName}...`);
  const editRes = await androidpublisher.edits.insert({
    packageName,
    requestBody: { changesNotSentForReview },
  });
  editId = editRes.data.id;
  console.log(`Edit created: ${editId}`);

  for (const locale of locales) {
    const localeDir = join(metadataDir, locale);

    const title = safeReadFile(join(localeDir, 'title.txt'));
    const shortDesc = safeReadFile(join(localeDir, 'short_description.txt'));
    const fullDesc = safeReadFile(join(localeDir, 'full_description.txt'));

    if (title || shortDesc || fullDesc) {
      console.log(`Updating listing for ${locale}...`);
      const listing = { language: locale };
      if (title) listing.title = title;
      if (shortDesc) listing.shortDescription = shortDesc;
      if (fullDesc) listing.fullDescription = fullDesc;

      await androidpublisher.edits.listings.update({
        packageName,
        editId,
        language: locale,
        requestBody: listing,
      });
      console.log('Listing updated.');
    }

    const imagesDir = join(localeDir, 'images');
    if (existsSync(imagesDir)) {
      const iconPath = join(imagesDir, 'icon.png');
      if (/\.png$/i.test(iconPath) && existsSync(iconPath)) {
        console.log(`Uploading icon for ${locale}...`);
        await androidpublisher.edits.images.upload({
          packageName,
          editId,
          imageType: 'icon',
          language: locale,
          media: { mimeType: 'image/png', body: createReadStream(iconPath) },
        });
        console.log('Icon uploaded.');
      }

      const featureGraphicPath = join(imagesDir, 'feature-graphic.png');
      if (existsSync(featureGraphicPath)) {
        console.log(`Uploading feature graphic for ${locale}...`);
        await androidpublisher.edits.images.upload({
          packageName,
          editId,
          imageType: 'featureGraphic',
          language: locale,
          media: { mimeType: 'image/png', body: createReadStream(featureGraphicPath) },
        });
        console.log('Feature graphic uploaded.');
      }

      const screenshotsDir = join(imagesDir, 'phone-screenshots');
      if (existsSync(screenshotsDir)) {
        const screenshotFiles = readdirSync(screenshotsDir)
          .filter((f) => /\.(png|jpe?g)$/i.test(f))
          .sort();
        for (const file of screenshotFiles) {
          console.log(`Uploading screenshot ${file} for ${locale}...`);
          await androidpublisher.edits.images.upload({
            packageName,
            editId,
            imageType: 'phoneScreenshots',
            language: locale,
            media: { mimeType: 'image/png', body: createReadStream(join(screenshotsDir, file)) },
          });
        }
        if (screenshotFiles.length) console.log(`${screenshotFiles.length} screenshot(s) uploaded.`);
      }
    }
  }

  let versionCode = versionCodeArg;
  if (aabPath) {
    if (!existsSync(aabPath)) fail(`AAB file not found: ${aabPath}`);
    console.log(`Uploading AAB: ${aabPath}...`);
    const uploadRes = await androidpublisher.edits.bundles.upload({
      packageName,
      editId,
      media: { mimeType: 'application/octet-stream', body: createReadStream(aabPath) },
    });
    versionCode = String(uploadRes.data.versionCode);
    console.log(`AAB uploaded. versionCode: ${versionCode}`);
  }

  const releaseNotes = locales.flatMap((locale) => {
    const changelogPath = join(metadataDir, locale, 'changelogs', `${versionCode}.txt`);
    const text = safeReadFile(changelogPath);
    if (!text) return [];
    return [{ language: locale, text }];
  });

  if (versionCode) {
    console.log(`Updating track "${track}" with release notes...`);
    try {
      await androidpublisher.edits.tracks.update({
        packageName,
        editId,
        track,
        requestBody: {
          track,
          releases: [
            {
              versionCodes: [Number(versionCode)],
              status: status === 'completed' ? 'completed' : 'draft',
              releaseNotes: releaseNotes.length ? releaseNotes : undefined,
            },
          ],
        },
      });
      console.log('Track updated.');
    } catch (trackErr) {
      console.log('Track update skipped (no release for versionCode yet):', trackErr.message);
    }
  }

  console.log('Committing edit...');
  await androidpublisher.edits.commit({
    packageName,
    editId,
    requestBody: { changesNotSentForReview },
  });

  console.log('\n=== SUCCESS ===');
  console.log(`Edit ID:       ${editId}`);
  console.log(`Package:       ${packageName}`);
  console.log(`Track:         ${track}`);
  console.log(`Status:        ${status}`);
  console.log(`Locales:       ${locales.join(', ')}`);
  console.log(`Version Code:  ${versionCode || 'n/a'}`);
  console.log('===============');
} catch (err) {
  console.error('Publication failed:', err.message);
  if (err.response && err.response.data) {
    console.error(JSON.stringify(err.response.data, null, 2));
  }
  if (editId) {
    try {
      console.log(`Cleaning up draft edit ${editId}...`);
      await androidpublisher.edits.delete({ packageName, editId });
      console.log('Draft edit deleted.');
    } catch (deleteErr) {
      console.error('Failed to delete draft edit:', deleteErr.message);
    }
  }
  process.exit(1);
}