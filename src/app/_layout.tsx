import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Tabs, usePathname } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Provider as ReduxProvider, useSelector } from 'react-redux';
import ProfileModal from '../components/ProfileModal';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { I18nProvider } from '../i18n/I18nContext';
import { RootState, store } from '../redux/store';

// ─── Config des onglets ───────────────────────────────────────────────────────
type TabConfig = {
  name: string;
  href: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const TABS: TabConfig[] = [
  {
    name: 'index',
    href: '/',
    label: 'Accueil',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    name: 'statistics',
    href: '/statistics',
    label: 'Statistiques',
    icon: 'chart-line',
    activeIcon: 'chart-bar',
  },
];

// ─── Sidebar Web ──────────────────────────────────────────────────────────────
function WebSidebar({ onOpenProfile }: { onOpenProfile: () => void }) {
  const { colors } = useTheme();
  const user = useSelector((state: RootState) => state.user);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/' || pathname === '/index'
      : pathname.startsWith(href);

  const initial = ((user.firstName || user.phone || '?')[0] ?? '?').toUpperCase();
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`.trim()
    : 'Utilisateur';

  return (
    <View style={[ss.sidebar, { backgroundColor: colors.surface, borderRightColor: colors.border }]}>

      {/* ── Logo / Branding ─────────────────────────────────── */}
      <View style={ss.brand}>
        <View style={[ss.brandIcon, { backgroundColor: colors.primary }]}>
          <MaterialCommunityIcons name="bank" size={22} color="#fff" />
        </View>
        <View>
          <Text style={[ss.brandName, { color: colors.text }]}>FinTech Guinée</Text>
          <Text style={[ss.brandSub, { color: colors.textMuted }]}>Gestion Financière</Text>
        </View>
      </View>

      {/* ── Navigation ──────────────────────────────────────── */}
      <View style={ss.navGroup}>
        <Text style={[ss.sectionLabel, { color: colors.textMuted }]}>NAVIGATION</Text>
        {TABS.map(tab => {
          const active = isActive(tab.href);
          return (
            <Link key={tab.name} href={tab.href as any} asChild>
              <Pressable
                style={({ pressed }) => [
                  ss.navItem,
                  active && { backgroundColor: colors.primary + '18' },
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={[ss.navIconBox, active && { backgroundColor: colors.primary + '22' }]}>
                  <MaterialCommunityIcons
                    name={active ? tab.activeIcon : tab.icon}
                    size={19}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </View>
                <Text
                  style={[
                    ss.navLabel,
                    { color: active ? colors.primary : colors.text },
                    active && ss.navLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {active && <View style={[ss.activePip, { backgroundColor: colors.primary }]} />}
              </Pressable>
            </Link>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* ── Pied de sidebar ─────────────────────────────────── */}
      <View style={[ss.sidebarFooter, { borderTopColor: colors.border }]}>
        {user.isRegistered && (
          <Pressable
            style={({ pressed }) => [ss.userCard, pressed && { opacity: 0.75 }]}
            onPress={onOpenProfile}
          >
            <View style={[ss.userAvatar, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[ss.userInitial, { color: colors.primary }]}>{initial}</Text>
            </View>
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <Text style={[ss.userName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[ss.userPhone, { color: colors.textMuted }]} numberOfLines={1}>
                {user.phone}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textMuted} />
          </Pressable>
        )}
        <Text style={[ss.versionText, { color: colors.textMuted }]}>FinTech Guinée • v1.0.0</Text>
      </View>
    </View>
  );
}

// ─── Layout Web (sidebar + contenu) ──────────────────────────────────────────
function WebLayout() {
  const { colors } = useTheme();
  const [profileVisible, setProfileVisible] = useState(false);

  return (
    <View style={[ss.webRoot, { backgroundColor: colors.background }]}>
      <WebSidebar onOpenProfile={() => setProfileVisible(true)} />
      <View style={ss.webMain}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          {TABS.map(tab => (
            <Tabs.Screen key={tab.name} name={tab.name} />
          ))}
        </Tabs>
      </View>
      <ProfileModal
        visible={profileVisible}
        onClose={() => setProfileVisible(false)}
      />
    </View>
  );
}

// ─── Layout Mobile (bottom tabs) ─────────────────────────────────────────────
function MobileLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          elevation: 24,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowOffset: { width: 0, height: -2 },
          shadowRadius: 16,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 22 : 8,
          paddingTop: 8,
          paddingHorizontal: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: 14,
          paddingHorizontal: 4,
        },
        tabBarActiveBackgroundColor: colors.primary + '15',
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name={focused ? tab.activeIcon : tab.icon}
                size={24}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

// ─── Point d'entrée ──────────────────────────────────────────────────────────
function AppLayout() {
  return Platform.OS === 'web' ? <WebLayout /> : <MobileLayout />;
}

export default function RootLayout() {
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <I18nProvider>
          <AppLayout />
        </I18nProvider>
      </ThemeProvider>
    </ReduxProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ss = StyleSheet.create({
  // ── Web
  webRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 260,
    borderRightWidth: 1,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 36,
    paddingHorizontal: 4,
  },
  brandIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  brandSub: {
    fontSize: 11,
    marginTop: 2,
  },
  navGroup: {
    gap: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  navIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
  },
  navLabelActive: {
    fontWeight: '700',
  },
  activePip: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitial: {
    fontSize: 16,
    fontWeight: '700',
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
  },
  userPhone: {
    fontSize: 11,
    marginTop: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  versionText: {
    fontSize: 10,
    textAlign: 'center',
  },
  webMain: {
    flex: 1,
  },
});
