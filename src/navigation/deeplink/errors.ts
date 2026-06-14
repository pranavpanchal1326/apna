// src/navigation/deeplink/errors.ts

export type DeepLinkErrorType =
  | 'expired_invite'
  | 'group_not_found'
  | 'content_deleted'
  | 'offline'
  | 'invalid_link'

export class DeepLinkError extends Error {
  type: DeepLinkErrorType

  constructor(type: DeepLinkErrorType, message?: string) {
    super(message || getErrorMessage(type))
    this.type = type
    this.name = 'DeepLinkError'
  }
}

export interface UserFacingError {
  type: DeepLinkErrorType
  message: string
}

function getErrorMessage(type: DeepLinkErrorType): string {
  switch (type) {
    case 'expired_invite':
      return 'This invite code has expired.'
    case 'group_not_found':
      return 'This group is no longer available.'
    case 'content_deleted':
      return 'This content is no longer available.'
    case 'offline':
      return "You're offline. Please connect to the internet to view this content."
    case 'invalid_link':
    default:
      return "We couldn't find that page."
  }
}

/**
 * Normalizes any error caught during deep link handling into a structured
 * user-facing error representation.
 */
export function handleDeepLinkError(error: any): UserFacingError {
  if (error instanceof DeepLinkError) {
    return {
      type: error.type,
      message: error.message,
    }
  }

  // Handle network/offline errors from Firestore/Firebase
  if (
    error &&
    (error.code === 'unavailable' ||
      error.message?.toLowerCase().includes('offline') ||
      error.message?.toLowerCase().includes('network'))
  ) {
    return {
      type: 'offline',
      message: getErrorMessage('offline'),
    }
  }

  return {
    type: 'invalid_link',
    message: getErrorMessage('invalid_link'),
  }
}
