import * as Contacts from 'expo-contacts'

export interface NormalisedContact {
  name: string
  phoneNumbers: string[]   // each is E.164 format: +91XXXXXXXXXX
}

export function normalisePhoneNumber(raw: string): string | null {
  // Strip all non-digit characters
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`
  }
  if (digits.length === 10 && !digits.startsWith('0')) {
    return `+91${digits}`
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`
  }
  return null
}

export async function readNormalisedContacts(): Promise<NormalisedContact[]> {
  const result: NormalisedContact[] = []
  const seenNumbers = new Set<string>()

  let pageOffset = 0
  const pageSize = 500
  let hasMore = true

  while (hasMore) {
    const response = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      pageSize,
      pageOffset,
    })

    if (!response.data || response.data.length === 0) {
      hasMore = false
      break
    }

    // Process batch of 500
    for (const contact of response.data) {
      const name = contact.name || 'Unnamed'
      const phoneNumbers: string[] = []

      if (contact.phoneNumbers) {
        for (const phone of contact.phoneNumbers) {
          if (phone.number) {
            const normalised = normalisePhoneNumber(phone.number)
            if (normalised && !seenNumbers.has(normalised)) {
              seenNumbers.add(normalised)
              phoneNumbers.push(normalised)
            }
          }
        }
      }

      if (phoneNumbers.length > 0) {
        result.push({
          name,
          phoneNumbers,
        })
      }

      // Truncate check after deduplication
      if (seenNumbers.size >= 1000) {
        hasMore = false
        break
      }
    }

    if (response.data.length < pageSize) {
      hasMore = false
    } else {
      pageOffset += pageSize
    }

    // Yield back to JS thread between pages
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return result.slice(0, 1000)
}
