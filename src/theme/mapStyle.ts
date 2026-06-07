// src/theme/mapStyle.ts
// Dhaga Map Styles — Mapbox custom style arrays
// From PRD §7 Map Style specification.
// Applied via styleURL or style prop on Mapbox MapView in Prompt 1.6.
// These are Mapbox Expression layers — do NOT modify without testing in Mapbox Studio.

// Dark map style — matches app dark theme
export const DarkMapStyle = [
  {
    id: 'background',
    type: 'background',
    paint: { 'background-color': '#0F1520' },
  },
  {
    id: 'land',
    type: 'fill',
    source: 'composite',
    'source-layer': 'landuse',
    paint: { 'fill-color': '#0F1520' },
  },
  {
    id: 'water',
    type: 'fill',
    source: 'composite',
    'source-layer': 'water',
    paint: { 'fill-color': '#0D1824' },
  },
  {
    id: 'parks',
    type: 'fill',
    source: 'composite',
    'source-layer': 'landuse',
    filter: ['==', 'class', 'park'],
    paint: { 'fill-color': '#141E14' },
  },
  {
    id: 'roads-minor',
    type: 'line',
    source: 'composite',
    'source-layer': 'road',
    filter: ['!=', 'class', 'motorway'],
    paint: {
      'line-color': '#1A2236',
      'line-width': 1,
    },
  },
  {
    id: 'roads-major',
    type: 'line',
    source: 'composite',
    'source-layer': 'road',
    filter: ['==', 'class', 'motorway'],
    paint: {
      'line-color': '#1A2236',
      'line-width': 2,
    },
  },
  {
    id: 'labels-place',
    type: 'symbol',
    source: 'composite',
    'source-layer': 'place_label',
    layout: {
      'text-field': '{name}',
      'text-font': ['Outfit Regular', 'Arial Unicode MS Regular'],
      'text-size': 10,
    },
    paint: { 'text-color': '#4A5468' },
  },
] as const

// Light map style — matches app light theme
export const LightMapStyle = [
  {
    id: 'background',
    type: 'background',
    paint: { 'background-color': '#F5F8FF' },
  },
  {
    id: 'land',
    type: 'fill',
    source: 'composite',
    'source-layer': 'landuse',
    paint: { 'fill-color': '#F5F8FF' },
  },
  {
    id: 'water',
    type: 'fill',
    source: 'composite',
    'source-layer': 'water',
    paint: { 'fill-color': '#C8DCF0' },
  },
  {
    id: 'parks',
    type: 'fill',
    source: 'composite',
    'source-layer': 'landuse',
    filter: ['==', 'class', 'park'],
    paint: { 'fill-color': '#D4EDD4' },
  },
  {
    id: 'roads',
    type: 'line',
    source: 'composite',
    'source-layer': 'road',
    paint: {
      'line-color': '#E8EDF5',
      'line-width': 1.5,
    },
  },
  {
    id: 'labels-place',
    type: 'symbol',
    source: 'composite',
    'source-layer': 'place_label',
    layout: {
      'text-field': '{name}',
      'text-font': ['Outfit Regular', 'Arial Unicode MS Regular'],
      'text-size': 10,
    },
    paint: { 'text-color': '#4A5468' },
  },
] as const
