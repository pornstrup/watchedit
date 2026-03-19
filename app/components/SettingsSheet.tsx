'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsSheet({
  open,
  onClose,
  onLogout,
}: {
  open: boolean
  onClose: () => void
  onLogout: () => void
}) {
  // Luk på escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl pb-10"
            style={{
              background: 'rgba(18, 18, 18, 0.95)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-5">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="px-6 flex flex-col gap-2">
              <p className="text-white/30 text-xs uppercase tracking-widest font-semibold mb-2">
                Konto
              </p>

              {/* Fremtidige indstillinger placeholder */}
              <div
                className="flex items-center justify-between px-4 py-3.5 rounded-2xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span className="text-white/30 text-sm">Notifikationer</span>
                <span className="text-white/20 text-xs">Kommer snart</span>
              </div>

              {/* Log ud */}
              <button
                onClick={onLogout}
                className="flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all"
                style={{
                  background: 'rgba(255, 59, 48, 0.08)',
                  border: '1px solid rgba(255, 59, 48, 0.15)',
                }}
              >
                <span className="text-red-400 text-sm font-medium">Log ud</span>
              </button>

              {/* Annuller */}
              <button
                onClick={onClose}
                className="flex items-center justify-center px-4 py-3.5 rounded-2xl mt-1 transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <span className="text-white/60 text-sm font-medium">Annuller</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}