/// FastFree Clan — Nix-backed Clan module with a Stac SDUI interface.
///
/// Backend (pure Dart, no Flutter):
/// - [ClanGenerator] generates `clan/*.yaml` + `nix.yaml` + `flake.nix`
///   using the official `nix` library schema.
/// - [ClanManager] combines generate / audit / sync.
///
/// Frontend (Flutter + Stac):
/// - [SduiClanScreen] renders server-driven UI via `Stac.fromNetwork`
///   with a bundled-asset offline fallback.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:stac/stac.dart';

import 'src/data/clan_data_placeholder.dart';
import 'src/presentation/clan_presentation_placeholder.dart';

export 'src/audit.dart';
export 'src/clan_manager.dart';
export 'src/config.dart';
export 'src/data/clan_data_placeholder.dart';
export 'src/domain/clan_domain_placeholder.dart';
export 'src/generator.dart';
// list.dart removed (unused ClanList).
export 'src/presentation/clan_dashboard_screen.dart';
export 'src/presentation/clan_nodes_screen.dart';
export 'src/presentation/clan_services_screen.dart';
export 'src/presentation/clan_users_screen.dart';
export 'src/presentation/clan_roles_screen.dart';
export 'src/sync.dart';

/// Entrypoint widget for the Clan SDUI module.
///
/// Renders server-driven UI from the backend; falls back to the bundled
/// `assets/fallback/clan_fallback.json` on error.
class SduiClanScreen extends StatefulWidget {
  final String backendUrl;
  final VoidCallback? onLoaded;
  final Widget? nextScreen;
  final bool enableRealtimeReload;

  const SduiClanScreen({
    super.key,
    this.backendUrl = 'http://localhost:8080/api/v1/clan',
    this.onLoaded,
    this.nextScreen,
    this.enableRealtimeReload = true,
  });

  @override
  State<SduiClanScreen> createState() => _SduiClanScreenState();
}

class _SduiClanScreenState extends State<SduiClanScreen> {
  Timer? _timer;
  int _reloadVersion = 0;
  http.Client? _sseClient;
  StreamSubscription<String>? _sseSubscription;

  late final ClanFlowController _flowController;

  @override
  void initState() {
    super.initState();
    _flowController = ClanFlowController(backendUrl: widget.backendUrl)
      ..addListener(_onFlowChanged);
    unawaited(_flowController.run());
    _timer = Timer(const Duration(seconds: 3), _completeLoad);
    if (widget.enableRealtimeReload) {
      unawaited(_listenForUpdates());
    }
  }

  void _onFlowChanged() {
    if (!mounted) return;
    setState(() {});
  }

  void _completeLoad() {
    widget.onLoaded?.call();
    if (widget.nextScreen != null && mounted) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => widget.nextScreen!),
      );
    }
  }

  String get _resolvedEventsUrl {
    final uri = Uri.tryParse(widget.backendUrl);
    if (uri != null && uri.hasScheme) {
      return uri.replace(path: '/api/v1/events', query: '').toString();
    }
    return 'http://localhost:8080/api/v1/events';
  }

  Future<void> _listenForUpdates() async {
    final eventsUri = Uri.tryParse(_resolvedEventsUrl);
    if (eventsUri == null) return;

    while (mounted && widget.enableRealtimeReload) {
      final client = http.Client();
      _sseClient = client;
      try {
        final request = http.Request('GET', eventsUri)
          ..headers['Accept'] = 'text/event-stream'
          ..headers['Cache-Control'] = 'no-cache';
        final response = await client.send(request);
        if (response.statusCode < 200 || response.statusCode >= 300) {
          await Future<void>.delayed(const Duration(seconds: 3));
          continue;
        }

        String? eventName;
        final dataLines = <String>[];
        _sseSubscription = response.stream
            .transform(utf8.decoder)
            .transform(const LineSplitter())
            .listen((line) {
          if (!mounted) return;
          if (line.isEmpty) {
            if (dataLines.isNotEmpty || eventName != null) {
              _handleSseEvent(eventName, dataLines.join('\n'));
            }
            eventName = null;
            dataLines.clear();
            return;
          }
          if (line.startsWith(':')) return;
          if (line.startsWith('event:')) {
            eventName = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.add(line.substring(5).trimLeft());
          }
        }, onError: (_) {}, onDone: () {});

        await _sseSubscription?.asFuture<void>();
      } catch (_) {
        // Ignore connection failures; offline fallback remains intact.
      } finally {
        await _sseSubscription?.cancel();
        _sseSubscription = null;
        if (identical(_sseClient, client)) {
          _sseClient = null;
        }
        client.close();
      }

      if (mounted && widget.enableRealtimeReload) {
        await Future<void>.delayed(const Duration(seconds: 3));
      }
    }
  }

  void _handleSseEvent(String? eventName, String data) {
    if (!mounted) return;
    setState(() => _reloadVersion++);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _sseSubscription?.cancel();
    _sseClient?.close();
    _flowController
      ..removeListener(_onFlowChanged)
      ..dispose();
    super.dispose();
  }

  Widget _placeholder(BuildContext context) {
    final flow = _flowController.state;
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Icon(Icons.hub, size: 72, color: Color(0xFF06B6D4)),
            const SizedBox(height: 16),
            const Text(
              'FastFree Clan',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Connecting to: ${widget.backendUrl}',
              style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 8),
            Text(
              'Stage: ${flow.stage.label} • ${flow.message}',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: flow.isOffline
                    ? const Color(0xFFF59E0B)
                    : const Color(0xFF38BDF8),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: 220,
              child: LinearProgressIndicator(
                value: flow.stage.progress,
                color: const Color(0xFF06B6D4),
                backgroundColor: const Color(0xFF1E293B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return KeyedSubtree(
      key: ValueKey<int>(_reloadVersion),
      child: Stac.fromNetwork(
        context: context,
        request: StacNetworkRequest(
          url: widget.backendUrl,
          method: Method.get,
        ),
        loadingWidget: (ctx) => _placeholder(ctx),
        errorWidget: (ctx, err) => Stac.fromAssets(
          ClanRepository.defaultFallbackAsset,
          loadingWidget: (c) => _placeholder(c),
          errorWidget: (c, e) => _placeholder(c),
        ),
      ),
    );
  }
}

/// Alias adhering to Stac prefix conventions.
typedef StacClanScreen = SduiClanScreen;
