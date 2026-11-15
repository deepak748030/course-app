/**
 * Server URL switcher sheet.
 *
 * Allows fast testing and switching of the backend server URL at runtime (e.g. pointing a
 * device to a local LAN server, staging host, or a moved domain) without rebuilding the app.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, Wifi } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button, FormField } from '@/components/ui';
import { colors, createStyles, radius, spacing, type } from '@/constants/theme';
import { useT } from '@/i18n';
import {
  apiUrl,
  BUILT_IN_API_URL,
  isManualServerUrl,
  setManualServerUrl,
  testServerConnection,
  type ConnectionTestResult,
} from '@/lib/serverUrl';

export function ServerUrlSheet({
  visible,
  onClose,
  onApplied,
}: {
  visible: boolean;
  onClose: () => void;
  onApplied?: (url: string) => void;
}) {
  const t = useT();
  const [url, setUrl] = useState(() => apiUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setUrl(apiUrl());
      setTestResult(null);
      setError(null);
    }
  }, [visible]);

  async function runTest() {
    setError(null);
    setTesting(true);
    const result = await testServerConnection(url);
    setTestResult(result);
    setTesting(false);
  }

  function apply() {
    setError(null);
    try {
      const next = setManualServerUrl(url);
      onApplied?.(next);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enter a valid URL starting with http:// or https://');
    }
  }

  function reset() {
    const next = setManualServerUrl(null);
    setUrl(next);
    setTestResult(null);
    setError(null);
    onApplied?.(next);
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Server connection")}
      subtitle={t("Enter the academy server address to switch instantly without rebuilding the app.")}
      scrollable
      footer={
        <View style={styles.footer}>
          <Button label={t("Save and reconnect")} onPress={apply} />
          {isManualServerUrl() ? (
            <Button label={t("Reset to default")} variant="ghost" icon={RotateCcw} onPress={reset} />
          ) : null}
        </View>
      }>
      <FormField
        label={t("Server URL")}
        value={url}
        onChangeText={(next) => {
          setUrl(next);
          setError(null);
          setTestResult(null);
        }}
        placeholder={BUILT_IN_API_URL}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={apply}
        error={error}
      />

      <View style={styles.testRow}>
        <Button
          label={t("Test connection")}
          variant="secondary"
          icon={Wifi}
          fullWidth={false}
          loading={testing}
          onPress={() => void runTest()}
        />
      </View>

      {testResult ? (
        <View
          style={[
            styles.statusBox,
            { backgroundColor: testResult.ok ? colors.successSoft : colors.errorSoft },
          ]}>
          {testResult.ok ? <CheckCircle2 size={16} color={colors.success} /> : null}
          <Text style={[type.label, { color: testResult.ok ? colors.success : colors.error, flex: 1 }]}>
            {testResult.ok
              ? `${t("Connected to server")} (${testResult.latencyMs ?? 0}ms)`
              : testResult.error}
          </Text>
        </View>
      ) : null}

      <Text style={[type.label, { color: colors.textSubtle }]}>
        Default: {BUILT_IN_API_URL}
      </Text>
    </BottomSheet>
  );
}

const styles = createStyles(() =>
  StyleSheet.create({
    footer: { gap: spacing.xs },
    testRow: { alignItems: 'flex-start' },
    statusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
  }),
);
