export class ClientFormatter {
  static clientRow(item: Record<string, unknown>) {
    return {
      id: item['id'],
      name: item['name'],
      email: item['email'],
      company: item['company'],
      avatar: item['avatar'],
      country: item['country'],
      joinedAt: item['joinedAt'],
      firstOrderAt: item['firstOrderAt'],
      lastOrderAt: item['lastOrderAt'],
      ordersCount: item['ordersCount'],
      lifetimeValueSar: item['lifetimeValueSar'],
      currency: 'SAR',
      averageOrderValueSar: item['averageOrderValueSar'],
      daysSinceLastOrder: item['daysSinceLastOrder'],
      classification: item['classification'],
      activityStatus: item['activityStatus'],
      creditTerms: item['creditTerms'],
      isManual: item['isManual'] ?? false,
    };
  }

  static clientHeader(item: Record<string, unknown>) {
    return {
      id: item['id'],
      name: item['name'],
      // TODO(phase-2): add company when buyer-profiles table exists
      company: null,
      email: item['email'],
      avatar: item['avatar'],
      country: item['country'],
      joinedAt: item['joinedAt'],
      initialsAvatarSeed: item['initialsAvatarSeed'],
    };
  }

  static clientStats(stats: Record<string, unknown>) {
    return {
      totalOrders: stats['totalOrders'],
      lifetimeValueSar: stats['lifetimeValueSar'],
      currency: 'SAR',
      creditLimitSar: stats['creditLimitSar'],
      // TODO(phase-2): implement response rate from messaging context
      responseRate: null,
    };
  }

  static orderRow(item: unknown) {
    return item;
  }

  static quotationRow(item: unknown) {
    return item;
  }
}
