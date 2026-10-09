'use client'

import { useState } from 'react'
import { Menu } from '@base-ui/react/menu'
import { Dialog } from '@base-ui/react/dialog'
import { KeyRound, LogOut, SlidersHorizontal, UserRoundCog, X } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

// Matches the minimum enforced on the sign-up form in auth-screen.tsx.
const MIN_PASSWORD_LENGTH = 8

type UserMenuProps = {
  userName: string
  showTaskIcons: boolean
  onShowTaskIconsChange: (value: boolean) => void
}

export function UserMenu({ userName, showTaskIcons, onShowTaskIconsChange }: UserMenuProps) {
  const [dialog, setDialog] = useState<'password' | 'preferences' | null>(null)
  const firstName = userName.trim().split(/\s+/)[0] || 'there'

  async function handleChangeUser() {
    try {
      await authClient.signOut()
    } finally {
      window.location.assign('/')
    }
  }

  return (
    <>
      <Menu.Root>
        <Menu.Trigger className="avatar-button" aria-label={`Account menu for ${firstName}`} title="Account">
          {firstName.slice(0, 1).toUpperCase()}
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="user-menu-positioner" side="bottom" align="end" sideOffset={8}>
            <Menu.Popup className="user-menu">
              <div className="user-menu-header">
                <span className="user-menu-label">Signed in as</span>
                <strong>{userName.trim() || 'Your account'}</strong>
              </div>
              <Menu.Item className="user-menu-item" onClick={() => setDialog('password')}><KeyRound aria-hidden="true" />Change password</Menu.Item>
              <Menu.Item className="user-menu-item" onClick={() => setDialog('preferences')}><SlidersHorizontal aria-hidden="true" />User preferences</Menu.Item>
              <Menu.Separator className="user-menu-separator" />
              <Menu.Item className="user-menu-item" onClick={handleChangeUser}><UserRoundCog aria-hidden="true" />Change user</Menu.Item>
              <Menu.Item className="user-menu-item" onClick={handleChangeUser}><LogOut aria-hidden="true" />Sign out</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>

      <Dialog.Root open={dialog === 'password'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogShell title="Change password" description="Choose a new password for your account.">
          <ChangePasswordForm onDone={() => setDialog(null)} />
        </DialogShell>
      </Dialog.Root>

      <Dialog.Root open={dialog === 'preferences'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogShell title="User preferences" description="Personalize how daylist looks for you.">
          <PreferencesForm userName={userName} showTaskIcons={showTaskIcons} onShowTaskIconsChange={onShowTaskIconsChange} onDone={() => setDialog(null)} />
        </DialogShell>
      </Dialog.Root>
    </>
  )
}

function DialogShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="dialog-backdrop" />
      <Dialog.Popup className="dialog-popup">
        <Dialog.Close className="dialog-close" aria-label="Close"><X aria-hidden="true" /></Dialog.Close>
        <Dialog.Title className="dialog-title">{title}</Dialog.Title>
        <Dialog.Description className="dialog-description">{description}</Dialog.Description>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  )
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = event.currentTarget
    const formData = new FormData(form)
    const currentPassword = String(formData.get('currentPassword') || '')
    const newPassword = String(formData.get('newPassword') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')
    const revokeOtherSessions = formData.get('revokeOtherSessions') === 'on'

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The new passwords don’t match.')
      return
    }
    if (newPassword === currentPassword) {
      setError('Choose a password that’s different from your current one.')
      return
    }

    setPending(true)
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions })
      if (result.error) {
        setError('We couldn’t change your password. Please check your current password and try again.')
        return
      }
      form.reset()
      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again in a moment.')
    } finally {
      setPending(false)
    }
  }

  if (success) {
    return (
      <div className="dialog-body">
        <p className="form-success" role="status">Your password has been updated.</p>
        <div className="dialog-actions"><button className="auth-submit dialog-submit" type="button" onClick={onDone}>Done</button></div>
      </div>
    )
  }

  return (
    <form className="auth-form dialog-body" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>Current password</span>
        <input name="currentPassword" type="password" autoComplete="current-password" required />
      </label>
      <label className="form-field">
        <span>New password</span>
        <input name="newPassword" type="password" autoComplete="new-password" placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`} minLength={MIN_PASSWORD_LENGTH} required />
      </label>
      <label className="form-field">
        <span>Confirm new password</span>
        <input name="confirmPassword" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
      </label>
      <label className="check-field"><input name="revokeOtherSessions" type="checkbox" /><span>Sign me out of other devices</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button className="dialog-cancel" type="button" onClick={onDone}>Cancel</button>
        <button className="auth-submit dialog-submit" type="submit" disabled={pending}>{pending ? 'Updating…' : 'Update password'}</button>
      </div>
    </form>
  )
}

function PreferencesForm({ userName, showTaskIcons, onShowTaskIconsChange, onDone }: { userName: string; showTaskIcons: boolean; onShowTaskIconsChange: (value: boolean) => void; onDone: () => void }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const name = String(new FormData(event.currentTarget).get('name') || '').trim()
    if (!name) {
      setError('Please enter a display name.')
      return
    }
    if (name !== userName.trim()) {
      setPending(true)
      try {
        const result = await authClient.updateUser({ name })
        if (result.error) {
          setError('We couldn’t save your name. Please try again.')
          return
        }
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again in a moment.')
        return
      } finally {
        setPending(false)
      }
    }
    onDone()
  }

  return (
    <form className="auth-form dialog-body" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>Display name</span>
        <input name="name" autoComplete="name" defaultValue={userName} maxLength={80} required />
      </label>
      <label className="check-field"><input type="checkbox" checked={showTaskIcons} onChange={(event) => onShowTaskIconsChange(event.target.checked)} /><span>Show emoji icons next to tasks</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button className="dialog-cancel" type="button" onClick={onDone}>Close</button>
        <button className="auth-submit dialog-submit" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save name'}</button>
      </div>
    </form>
  )
}
