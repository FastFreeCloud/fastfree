import 'package:flutter/foundation.dart';

import '../data/clan_data_placeholder.dart';

/// Stages for the clan load flow.
enum ClanStage {
  init,
  checkBackend,
  loadConfig,
  cacheReady,
  complete,
}

extension ClanStageX on ClanStage {
  String get label {
    switch (this) {
      case ClanStage.init:
        return 'Initializing';
      case ClanStage.checkBackend:
        return 'Checking backend';
      case ClanStage.loadConfig:
        return 'Loading config';
      case ClanStage.cacheReady:
        return 'Cache ready';
      case ClanStage.complete:
        return 'Complete';
    }
  }

  double get progress {
    switch (this) {
      case ClanStage.init:
        return 0.1;
      case ClanStage.checkBackend:
        return 0.35;
      case ClanStage.loadConfig:
        return 0.65;
      case ClanStage.cacheReady:
        return 0.85;
      case ClanStage.complete:
        return 1.0;
    }
  }
}

/// Immutable snapshot of the clan flow state.
class ClanState {
  const ClanState({
    this.stage = ClanStage.init,
    this.isOffline = false,
    this.message = 'Starting…',
    this.configJson,
    this.error,
  });

  final ClanStage stage;
  final bool isOffline;
  final String message;
  final Map<String, dynamic>? configJson;
  final Object? error;

  bool get isComplete => stage == ClanStage.complete;

  ClanState copyWith({
    ClanStage? stage,
    bool? isOffline,
    String? message,
    Map<String, dynamic>? configJson,
    Object? error,
    bool clearError = false,
  }) {
    return ClanState(
      stage: stage ?? this.stage,
      isOffline: isOffline ?? this.isOffline,
      message: message ?? this.message,
      configJson: configJson ?? this.configJson,
      error: clearError ? null : (error ?? this.error),
    );
  }
}

/// Lightweight controller for the clan load flow.
class ClanFlowController extends ChangeNotifier {
  ClanFlowController({ClanRepository? repository, String? backendUrl})
      : _repository = repository ?? ClanRepository(),
        _backendUrl = backendUrl ?? 'http://localhost:8080/api/v1/clan',
        _state = const ClanState();

  final ClanRepository _repository;
  String _backendUrl;
  ClanState _state;
  bool _running = false;
  bool _disposed = false;

  ClanState get state => _state;
  ClanStage get stage => _state.stage;
  String get backendUrl => _backendUrl;

  void updateBackendUrl(String url) {
    if (url.isEmpty || url == _backendUrl) return;
    _backendUrl = url;
  }

  Future<void> run() async {
    if (_running) return;
    _running = true;
    try {
      _emit(_state.copyWith(
        stage: ClanStage.init,
        message: 'Initializing clan…',
        clearError: true,
      ));
      await Future<void>.delayed(const Duration(milliseconds: 80));
      if (_disposed) return;

      _emit(_state.copyWith(
        stage: ClanStage.checkBackend,
        message: 'Checking backend connectivity…',
      ));
      final reachable = await _repository.checkBackend(_backendUrl);
      if (_disposed) return;

      _emit(_state.copyWith(
        stage: ClanStage.loadConfig,
        isOffline: !reachable,
        message: reachable
            ? 'Loading clan config from backend…'
            : 'Backend unavailable, resolving offline config…',
      ));
      final resolved = await _repository.resolveConfig(_backendUrl);
      if (_disposed) return;

      _emit(ClanState(
        stage: ClanStage.cacheReady,
        isOffline: !reachable,
        message: reachable ? 'Config loaded from backend' : 'Using offline fallback',
        configJson: resolved,
      ));
      await Future<void>.delayed(const Duration(milliseconds: 80));
      if (_disposed) return;

      _emit(_state.copyWith(
        stage: ClanStage.complete,
        message: _state.isOffline ? 'Ready (offline fallback)' : 'Ready',
      ));
    } finally {
      _running = false;
    }
  }

  void _emit(ClanState next) {
    _state = next;
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _repository.dispose();
    super.dispose();
  }
}

/// Backwards-compatible placeholder symbol kept for existing imports/tests.
const String clanPresentationStatus = 'Clan Presentation Layer implemented';
