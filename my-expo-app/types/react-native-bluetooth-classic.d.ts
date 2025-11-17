declare module 'react-native-bluetooth-classic' {
  export interface BluetoothDevice {
    address: string;
    name: string;
    bonded: boolean;
    deviceClass?: number;
    rssi?: number;
  }

  export interface Connection {
    address: string;
    connected: boolean;
  }

  interface RNBluetoothClassic {
    requestBluetoothEnabled(): Promise<void>;
    getBondedDevices(): Promise<BluetoothDevice[]>;
    getConnectedDevices(): Promise<BluetoothDevice[]>;
    startDiscovery(): Promise<BluetoothDevice[]>;
    cancelDiscovery(): Promise<boolean>;
    pairDevice(address: string): Promise<BluetoothDevice>;
    unpairDevice(address: string): Promise<boolean>;
    connect(address: string): Promise<BluetoothDevice>;
    disconnect(address: string): Promise<boolean>;
    isDeviceConnected(address: string): Promise<boolean>;
    getDevice(address: string): Promise<BluetoothDevice>;
    writeToDevice(address: string, data: Uint8Array | string): Promise<boolean>;
    readFromDevice(address: string): Promise<Uint8Array>;
    clear(): Promise<void>;
    onDeviceConnected(callback: (device: BluetoothDevice) => void): () => void;
    onDeviceDisconnected(callback: (device: BluetoothDevice) => void): () => void;
    onDataReceived(callback: (data: { device: BluetoothDevice; data: Uint8Array }) => void): () => void;
    onDeviceRead(callback: (data: { device: BluetoothDevice; data: Uint8Array }) => void): () => void;
    onError(callback: (error: Error) => void): () => void;
    onDeviceDiscovered(callback: (device: BluetoothDevice) => void): () => void;
    openBluetoothSettings(): Promise<void>;
  }

  const RNBluetoothClassic: RNBluetoothClassic;
  export default RNBluetoothClassic;
}
