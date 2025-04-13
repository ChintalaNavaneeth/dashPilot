import { AndroidBluetoothDevice, iOSBluetoothDevice } from 'react-native-bluetooth-serial-next';

declare module 'react-native-bluetooth-serial-next' {
  export interface BluetoothDriverConfig {
    baudRate?: number;
    bufferSize?: number;
    protocol?: 'elm327' | 'obd2' | 'custom';
    vendor?: string;
  }

  export interface BluetoothSerialType {
    list(): Promise<AndroidBluetoothDevice[] | iOSBluetoothDevice[]>;
    discoverUnpairedDevices(): Promise<AndroidBluetoothDevice[] | iOSBluetoothDevice[]>;
    cancelDiscovery(): Promise<boolean>;
    requestEnable(): Promise<boolean>;
    enable(): Promise<boolean>;
    disable(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    connect(id: string, config?: BluetoothDriverConfig): Promise<boolean>;
    disconnect(): Promise<boolean>;
    write(data: string | number[] | Buffer): Promise<boolean>;
    readLine(): Promise<string>;
    readFromDevice(): Promise<Buffer>;
    withDelimiter(delimiter: string): void;
    clear(): void;
    available(): Promise<number>;
    setEncoding(encoding: 'ascii' | 'utf8' | 'utf16' | 'base64'): void;
    on(event: 'data' | 'error' | 'connect' | 'disconnect', callback: (data: any) => void): void;
    removeListener(event: string, callback: (data: any) => void): void;
  }

  const BluetoothSerial: BluetoothSerialType;
  export default BluetoothSerial;
}