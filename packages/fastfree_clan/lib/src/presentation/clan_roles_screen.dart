import 'package:flutter/material.dart';
import 'package:stac/stac.dart';

/// SDUI screen: Clan roles (permissions).
///
/// Renders the role/permission catalog via [Stac.fromNetwork].
class ClanRolesScreen extends StatelessWidget {
  final String? backendUrl;

  const ClanRolesScreen({super.key, this.backendUrl});

  @override
  Widget build(BuildContext context) {
    return Stac.fromNetwork(
      context: context,
      request: StacNetworkRequest(
        url: backendUrl ?? 'http://localhost:8080/api/v1/clan/roles',
        method: Method.get,
      ),
      loadingWidget: (ctx) => const Center(child: CircularProgressIndicator()),
      errorWidget: (ctx, err) => _ErrorWidget(err),
    );
  }
}

class _ErrorWidget extends StatelessWidget {
  final Object error;

  const _ErrorWidget(this.error);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 12),
          Text('Error: ${error.toString()}'),
        ],
      ),
    );
  }
}
