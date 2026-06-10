import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Haptics from 'expo-haptics'
import type { TripWeather } from '../lib/types/weather.types'
import {
  buildWeatherCacheKey,
  fetchTripWeather,
  geocodeDestination,
  getCachedWeather,
  isWeatherStale,
  setCachedWeather,
  type WeatherCoordinates,
} from '../lib/weather'

interface AnchorLocation {
  lat: number
  lng: number
  placeName?: string
}

interface UseTripWeatherParams {
  groupId: string | null
  destination?: string | null
  anchorLocation?: AnchorLocation | null
}

interface UseTripWeatherResult {
  weather: TripWeather | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  hasStaleCache: boolean
  refreshWeather: () => Promise<void>
}

export function useTripWeather({
  groupId,
  destination,
  anchorLocation,
}: UseTripWeatherParams): UseTripWeatherResult {
  const [weather, setWeather] = useState<TripWeather | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestRequestRef = useRef(0)
  const lastAutoFetchKeyRef = useRef<string | null>(null)

  const destinationLabel = destination?.trim() ||
    anchorLocation?.placeName ||
    'trip-destination'

  const cacheKey = useMemo(() => {
    if (!groupId) return null
    return buildWeatherCacheKey(groupId, destinationLabel)
  }, [groupId, destinationLabel])

  const fetchSignature = useMemo(() => {
    const anchorKey = anchorLocation
      ? `${anchorLocation.lat.toFixed(4)},${anchorLocation.lng.toFixed(4)}`
      : 'destination'
    return `${cacheKey ?? 'no-cache'}:${anchorKey}`
  }, [anchorLocation, cacheKey])

  const hasStaleCache = weather ? isWeatherStale(weather.fetchedAt) : false

  useEffect(() => {
    if (!cacheKey) {
      setWeather(null)
      setError(null)
      return
    }

    const cached = getCachedWeather(cacheKey)
    setWeather(cached)
    setError(null)
  }, [cacheKey])

  const resolveCoordinates = useCallback(async (): Promise<WeatherCoordinates | null> => {
    if (anchorLocation) {
      return {
        lat: anchorLocation.lat,
        lon: anchorLocation.lng,
        placeName: anchorLocation.placeName ?? destinationLabel,
      }
    }

    if (!destination?.trim()) return null
    return geocodeDestination(destination)
  }, [anchorLocation, destination, destinationLabel])

  const fetchWeather = useCallback(async (withHaptic: boolean) => {
    if (!cacheKey || !groupId) return

    const requestId = latestRequestRef.current + 1
    latestRequestRef.current = requestId
    setIsRefreshing(true)
    setIsLoading((current) => current || !weather)
    setError(null)

    try {
      const coordinates = await resolveCoordinates()
      if (!coordinates) {
        if (latestRequestRef.current === requestId) {
          setError('Forecast unavailable')
        }
        return
      }

      const freshWeather = await fetchTripWeather({
        lat: coordinates.lat,
        lon: coordinates.lon,
        placeName: coordinates.placeName,
      })

      if (latestRequestRef.current !== requestId) return

      setCachedWeather(cacheKey, freshWeather)
      setWeather(freshWeather)
      setError(null)
      if (withHaptic) {
        Haptics.selectionAsync()
      }
    } catch {
      if (latestRequestRef.current === requestId) {
        setError('Forecast unavailable')
      }
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsRefreshing(false)
        setIsLoading(false)
      }
    }
  }, [cacheKey, groupId, resolveCoordinates, weather])

  const refreshWeather = useCallback(async () => {
    await fetchWeather(true)
  }, [fetchWeather])

  useEffect(() => {
    if (!cacheKey || !groupId) return
    if (lastAutoFetchKeyRef.current === fetchSignature) return
    lastAutoFetchKeyRef.current = fetchSignature
    fetchWeather(false)
  }, [cacheKey, fetchSignature, groupId, fetchWeather])

  return {
    weather,
    isLoading,
    isRefreshing,
    error,
    hasStaleCache,
    refreshWeather,
  }
}
