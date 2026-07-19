import React from 'react'
import { View, Text } from 'react-native'

export const MapView = ({ children, style }: any) => (
  <View style={[{ flex: 1, backgroundColor: '#161512', alignItems: 'center', justifyContent: 'center' }, style]}>
    <Text style={{ color: '#D96A50', fontSize: 16, fontWeight: 'bold' }}>apna Map</Text>
    <Text style={{ color: '#8F8A7E', fontSize: 13, marginTop: 4 }}>Native MapLibre active on Android device</Text>
    {children}
  </View>
)
export const Map = MapView
export const Camera = React.forwardRef((_props: any, _ref: any) => null)
export const UserLocation = (_props: any) => null
export const PointAnnotation = ({ children, style }: any) => <View style={style}>{children}</View>
export const MarkerView = ({ children, style }: any) => <View style={style}>{children}</View>
export const ShapeSource = ({ children }: any) => <>{children}</>
export const LineLayer = (_props: any) => null
export const SymbolLayer = (_props: any) => null
export const FillLayer = (_props: any) => null
export const CircleLayer = (_props: any) => null
export const Callout = ({ children }: any) => <>{children}</>
export const setAccessToken = () => {}
export const setWellKnownTileServer = () => {}

const MapLibreWeb = {
  MapView,
  Map: MapView,
  Camera,
  UserLocation,
  PointAnnotation,
  MarkerView,
  ShapeSource,
  LineLayer,
  SymbolLayer,
  FillLayer,
  CircleLayer,
  Callout,
  setAccessToken,
  setWellKnownTileServer,
}

export default MapLibreWeb
