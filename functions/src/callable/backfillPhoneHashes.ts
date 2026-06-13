import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import * as crypto from 'crypto'

/**
 * Scheduled migration function to backfill phoneHash for all users missing it.
 * Runs once every 24 hours. Safe to delete after one week.
 */
export const backfillPhoneHashes = onSchedule(
  { schedule: 'every 24 hours', region: 'asia-south1' },
  async () => {
    const db = getFirestore()
    const snapshot = await db.collection('users').get()
    
    let batch = db.batch()
    let count = 0
    let total = 0

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      if (!data.phoneHash && data.phone) {
        const digits = data.phone.replace(/\D/g, '')
        let normalised = ''
        if (digits.length === 12 && digits.startsWith('91')) {
          normalised = `+${digits}`
        } else if (digits.length === 10 && !digits.startsWith('0')) {
          normalised = `+91${digits}`
        } else if (digits.length === 11 && digits.startsWith('0')) {
          normalised = `+91${digits.slice(1)}`
        } else {
          normalised = `+${digits}`
        }
        
        const hash = crypto.createHash('sha256').update(normalised).digest('hex').toLowerCase()
        const phoneHash = hash.substring(0, 16)
        
        batch.update(docSnap.ref, { phoneHash })
        count++
        total++

        // Firestore transaction/batch limit is 500 writes
        if (count === 400) {
          await batch.commit()
          batch = db.batch()
          count = 0
        }
      }
    }

    if (count > 0) {
      await batch.commit()
    }
    console.info(`[backfillPhoneHashes] Backfilled ${total} users.`)
  }
)
