'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Step = 'name' | 'invite' | 'waiting'

export default function NewGroupClient() {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const createGroup = async () => {
    if (!name.trim()) return
    setLoading(true)

    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const data = await res.json()
    if (!data.group) return setLoading(false)

    setGroupId(data.group.id)

    const inviteRes = await fetch('/api/groups/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: data.group.id }),
    })
    const inviteData = await inviteRes.json()
    setInviteUrl(inviteData.url)
    setLoading(false)
    setStep('invite')
  }

  const copyLink = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareLink = async () => {
    if (!inviteUrl) return
    if (navigator.share) {
      await navigator.share({
        title: `Tilmeld dig ${name} på WatchedIt`,
        url: inviteUrl,
      })
    } else {
      copyLink()
    }
  }

  return (
    <div className="w-full max-w-xs flex flex-col gap-8">
      <AnimatePresence mode="wait">

        {/* STEP 1 – NAVN */}
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-8"
          >
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-white text-3xl font-bold">Hvad kalder I det?</h1>
              <p className="text-white/30 text-sm">Du kan altid ændre det senere</p>
            </div>

            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && createGroup()}
              placeholder="Sofakveld, Os to, Film club..."
              className="w-full bg-transparent text-white text-xl text-center outline-none placeholder:text-white/20 border-b border-white/10 pb-3 focus:border-white/30 transition-colors"
            />

            <motion.button
              onClick={createGroup}
              disabled={!name.trim() || loading}
              animate={{ opacity: name.trim() ? 1 : 0.3 }}
              transition={{ duration: 0.2 }}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl text-black font-semibold text-base"
              style={{ background: 'white' }}
            >
              {loading ? 'Opretter...' : 'Fortsæt →'}
            </motion.button>

            <button
              onClick={() => window.history.back()}
              className="text-white/30 text-sm text-center"
            >
              Annuller
            </button>
          </motion.div>
        )}

        {/* STEP 2 – INVITE */}
        {step === 'invite' && (
          <motion.div
            key="invite"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-8"
          >
            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-white text-3xl font-bold">Inviter til {name}</h1>
              <p className="text-white/30 text-sm">Del linket med dem du vil se sammen med</p>
            </div>

            {/* INVITE KORT */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col gap-3 p-4 rounded-2xl"
              style={{
                background: 'rgba(255, 255, 255, 0.07)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <p className="text-white/40 text-xs uppercase tracking-widest font-semibold">Invite-link</p>
              <p className="text-white/70 text-sm break-all leading-relaxed font-mono">
                {inviteUrl}
              </p>
            </motion.div>

            {/* KNAPPER */}
            <div className="flex flex-col gap-3">
              <motion.button
                onClick={shareLink}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-black font-semibold text-base"
                style={{ background: 'white' }}
              >
                Del link
              </motion.button>

              <motion.button
                onClick={copyLink}
                whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl text-sm font-medium transition-colors"
                style={{
                  background: copied ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.07)',
                  border: copied ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: copied ? 'rgb(52, 199, 89)' : 'rgba(255,255,255,0.6)',
                }}
              >
                {copied ? '✓ Kopieret' : 'Kopier link'}
              </motion.button>

              <button
                onClick={() => {
                  setStep('waiting')
                }}
                className="text-white/30 text-sm text-center pt-1"
              >
                Gå til gruppen →
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3 – VENTER */}
        {step === 'waiting' && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-8 text-center"
          >
            <div className="flex flex-col gap-2">
              <motion.h1
                className="text-white text-3xl font-bold"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                Venter på {name}...
              </motion.h1>
              <p className="text-white/30 text-sm">Appen virker fuldt ud i mellemtiden</p>
            </div>

            <motion.button
              onClick={() => window.location.href = '/'}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 rounded-2xl text-black font-semibold text-base"
              style={{ background: 'white' }}
            >
              Gå til Min liste
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}