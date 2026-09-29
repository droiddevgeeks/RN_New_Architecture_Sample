import type * as React from 'react';
import type { CodegenTypes, HostComponent, ViewProps } from 'react-native';
import { codegenNativeCommands, codegenNativeComponent } from 'react-native';

/**
 * Fabric Native Component spec. Codegen generates props/event emitter/
 * component descriptor C++ plus the Android ViewManager interface + delegate.
 */

type PayPressEvent = {
  timestamp: CodegenTypes.Double;
};

export interface NativeProps extends ViewProps {
  label: string;
  amount: string;
  disabled?: CodegenTypes.WithDefault<boolean, false>;
  variant?: CodegenTypes.WithDefault<'primary' | 'outline', 'primary'>;
  onPayPress?: CodegenTypes.DirectEventHandler<PayPressEvent>;
}

interface NativeCommands {
  setLoading: (
    viewRef: React.ComponentRef<HostComponent<NativeProps>>,
    isLoading: boolean,
  ) => void;
}

export const Commands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['setLoading'],
});

export default codegenNativeComponent<NativeProps>(
  'PayButton',
) as HostComponent<NativeProps>;
