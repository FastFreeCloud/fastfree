import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;
import 'package:http/http.dart' as http;

/// Repository that resolves clan SDUI config using a multi-tier strategy:
/// network -> in-memory cache -> bundled asset fallback.
class ClanRepository {
  ClanRepository({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// Simple process-level memory cache (Tier 2).
  static final Map<String, Map<String, dynamic>> _memoryCache =
      <String, Map<String, dynamic>>{};

  static const String defaultFallbackAsset =
      'packages/fastfree_clan/assets/fallback/clan_fallback.json';

  Uri resolveEndpoint(String backendUrl) {
    return Uri.tryParse(backendUrl) ??
        Uri.parse('http://localhost:8080/api/v1/clan');
  }

  /// Tier 1: fetch from backend.
  Future<Map<String, dynamic>> fetchRemote(String backendUrl) async {
    final uri = resolveEndpoint(backendUrl);
    final res = await _client
        .get(uri, headers: const {'Accept': 'application/json'})
        .timeout(const Duration(seconds: 5));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Clan backend returned ${res.statusCode}');
    }
    final decoded = jsonDecode(res.body);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Clan backend payload is not a JSON object');
    }
    _memoryCache[backendUrl] = decoded;
    return decoded;
  }

  /// Tier 2: in-memory cached config (if available).
  Map<String, dynamic>? readMemoryCache(String backendUrl) {
    final cached = _memoryCache[backendUrl];
    if (cached == null) return null;
    return Map<String, dynamic>.from(cached);
  }

  /// Tier 3: bundled asset fallback.
  Future<Map<String, dynamic>> loadBundledFallback({
    String assetPath = defaultFallbackAsset,
  }) async {
    final raw = await rootBundle.loadString(assetPath);
    final decoded = jsonDecode(raw);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Bundled clan fallback is not a JSON object');
    }
    return decoded;
  }

  /// Resolve config using multi-tier fallback strategy.
  Future<Map<String, dynamic>> resolveConfig(String backendUrl) async {
    try {
      return await fetchRemote(backendUrl);
    } catch (_) {
      final mem = readMemoryCache(backendUrl);
      if (mem != null) return mem;
      return loadBundledFallback();
    }
  }

  /// Lightweight backend reachability probe.
  Future<bool> checkBackend(String backendUrl) async {
    try {
      final uri = resolveEndpoint(backendUrl);
      final res = await _client
          .get(uri, headers: const {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 3));
      return res.statusCode >= 200 && res.statusCode < 500;
    } catch (_) {
      return false;
    }
  }

  void dispose() {
    _client.close();
  }
}

/// Backwards-compatible placeholder symbol kept for existing imports/tests.
const String clanDataStatus = 'Clan Data Layer implemented';
