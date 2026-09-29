import type * as React from 'react';
import { useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import PayButtonNativeComponent, {
  Commands,
} from '../../specs/PayButtonNativeComponent';

export type PayButtonVariant = 'primary' | 'outline';

export type PayButtonHandle = {
  /** Dispatches the `setLoading` view command straight to the native view. */
  setLoading(isLoading: boolean): void;
};

export type PayButtonProps = {
  label: string;
  amount?: string;
  disabled?: boolean;
  variant?: PayButtonVariant;
  onPress?: (event: { timestamp: number }) => void;
  style?: StyleProp<ViewStyle>;
  ref?: React.Ref<PayButtonHandle>;
};

type NativeRef = React.ComponentRef<typeof PayButtonNativeComponent>;

/** Typed wrapper over the `PayButton` Fabric Native Component. */
export function PayButton({
  ref,
  label,
  amount = '',
  disabled = false,
  variant = 'primary',
  onPress,
  style,
}: PayButtonProps) {
  const nativeRef = useRef<NativeRef>(null);

  useImperativeHandle(
    ref,
    () => ({
      setLoading(isLoading: boolean) {
        if (nativeRef.current) {
          Commands.setLoading(nativeRef.current, isLoading);
        }
      },
    }),
    [],
  );

  return (
    <PayButtonNativeComponent
      ref={nativeRef}
      style={[styles.base, style]}
      label={label}
      amount={amount}
      disabled={disabled}
      variant={variant}
      onPayPress={onPress ? event => onPress(event.nativeEvent) : undefined}
    />
  );
}

const styles = StyleSheet.create({
  // Fabric native views have no intrinsic size — the host layout decides.
  base: { height: 52, alignSelf: 'stretch' },
});
