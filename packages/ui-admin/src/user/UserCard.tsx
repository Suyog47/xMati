import { Card, Elevation, Icon, Dialog, Button, Spinner, Divider } from '@blueprintjs/core'
import { confirmDialog, lang, toast } from 'botpress/shared'
import React, { useEffect, useState } from 'react'
import packageJson from '../../../../package.json'
import api from '~/app/api'
import TransactionHistory from './Subscription-screens/TransactionHistory'

interface UserData {
  fullName: string
  email: string
  phoneNumber: string
  password: string
  organisationName: string
  industryType: string
  subIndustryType: string
  numberOfBots: number
  stripeCustomerId: string
  stripePayementId: string
  botIdList: { id: string; owner: string }[]
}

interface SubscriptionData {
  name: string
  subscription: string
  createdAt: string
  till: string
  duration: string
  amount: string
  isCancelled?: boolean
}

interface BotsData {
  id: string
  name: string
}

interface UserCardProps {
  email: string
  userData: UserData
  subscriptionData: SubscriptionData
  botsData: BotsData[]
}

const CURRENT_VERSION = packageJson.version
const API_URL = process.env.REACT_APP_API_URL || 'https://www.app.xmati.ai/apis'

const UserCard: React.FC<UserCardProps> = ({ email, userData, subscriptionData, botsData }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')
  const savedSubData = JSON.parse(localStorage.getItem('subData') || '{}')
  const token = JSON.parse(localStorage.getItem('token') || '{}')

  // Dummy transaction state and functions for UI demo
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)

  const fetchTransactions = async (email) => {
    setIsLoadingTransactions(true)
    try {
      const res = await fetch(`${API_URL}/get-stripe-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-App-Version': CURRENT_VERSION
        },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error)
      }

      if (!data || !Array.isArray(data.charges)) {
        throw new Error('Invalid data of transactions.')
      }

      const latestCharge = data?.charges?.[0]
      if (latestCharge?.id) {
        localStorage.setItem('subData', JSON.stringify({ ...savedSubData, transactionId: latestCharge.id }))
      }

      if (data.charges) {
        setTransactions(data.charges)
      }
    } catch (error) {
      alert(error)
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoadingTransactions(false)
    }
  }

  const downloadCSV = async () => {
    const email = userData.email

    const res = await fetch(`${API_URL}/download-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-App-Version': CURRENT_VERSION
      },
      body: JSON.stringify({ data: transactions, email }),
    })

    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${email}-data.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleOpenDialog = () => setIsDialogOpen(true)
  const handleCloseDialog = () => setIsDialogOpen(false)

  function formatDate(dateStr: string) {
    if (!dateStr || dateStr === '-') {
      return '-'
    }
    const date = new Date(dateStr)
    return isNaN(date.getTime())
      ? dateStr
      : date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
  }

  // Automatically fetch transactions when the dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      void fetchTransactions(userData.email)
    }
  }, [isDialogOpen])

  // Calculate isExpired by comparing only dates (ignoring time)
  const getIsExpired = () => {
    if (!subscriptionData.till) {
      return false
    }
    const tillDate = new Date(subscriptionData.till)
    tillDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return tillDate < today
  }
  const isExpired = getIsExpired()

  const deleteBot = async (fullName: string, email: string, botId: string) => {
    const savedFormData = JSON.parse(localStorage.getItem('formData') || '{}')

    const confirmed = await confirmDialog(lang.tr('admin.workspace.bots.confirmDelete'), {
      acceptLabel: lang.tr('delete')
    })
    if (!confirmed) {
      return
    }

    try {
      await api.getSecured().post(`/admin/workspace/bots/${fullName}/${email}/${botId}/delete`)
      setTimeout(() => {
        window.location.reload()    // reloading for the bot creation limit check
      }, 500)
      toast.success(lang.tr('The bot has been deleted successfully'))
    } catch (err) {
      console.error(err)
      toast.failure(lang.tr('The bot could not be deleted'))
    }
  }

  return (
    <>
      <Card
        elevation={Elevation.TWO}
        onClick={handleOpenDialog}
        style={{
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          position: 'relative',
          border: `2px solid ${isExpired ? 'red' : '#04A9E1'}`,
          cursor: 'pointer',
        }}
      >
        {subscriptionData.till && (() => {
          return (
            isExpired && (
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: '#FFE0B2',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#EF6C00',
                }}
              >
                Expired Account
              </div>
            )
          )
        })()}
        <div style={{ fontSize: '18px', fontWeight: 600, color: '#182026' }}>
          <Icon icon="user" style={{ marginRight: '8px' }} />
          {userData.fullName}
        </div>
        <div style={{ fontSize: '14px', color: '#5C7080' }}>
          <Icon icon="envelope" style={{ marginRight: '6px' }} />
          {email}
        </div>
        <div
          style={{
            marginTop: '6px',
            padding: '6px 12px',
            width: 'fit-content',
            backgroundColor: '#E1F5FE',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '13px',
            color: '#106BA3',
          }}
        >
          <Icon icon="star" style={{ marginRight: '6px' }} />
          {subscriptionData.subscription} Plan
        </div>
      </Card>

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title="User Overview"
        style={{ width: '1400px', maxHeight: '97vh' }}
      >
        <div style={{ display: 'flex', padding: '24px', gap: '32px' }}>
          {/* LEFT: User Info + Subscription */}
          <div style={{ flex: 1 }}>
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px' }}>
              👤 User Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              <div><strong>Full Name:</strong><br />{userData.fullName || 'N/A'}</div>
              <div><strong>Email:</strong><br />{userData.email || 'N/A'}</div>
              <div><strong>Phone Number:</strong><br />{userData.phoneNumber || 'N/A'}</div>
              <div><strong>Organisation:</strong><br />{userData.organisationName || 'N/A'}</div>
              <div>
                <strong>Industry:</strong><br />
                {userData.industryType} | {userData.subIndustryType || 'N/A'}
              </div>
              <div><strong>No. of Bots:</strong><br />{botsData.length ?? '0'}</div>
              <div><strong>Stripe Customer ID:</strong><br />{userData.stripeCustomerId || 'N/A'}</div>
              <div><strong>Stripe Payment ID:</strong><br />{userData.stripePayementId || 'N/A'}</div>
            </div>
            <hr style={{ margin: '32px 0', border: 'none', borderTop: '2px solid #ccc' }} />
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px' }}>
              💳 Subscription Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              <div><strong>Plan:</strong><br />{subscriptionData.subscription || 'N/A'}</div>
              <div>
                <strong>Created At:</strong><br />
                {subscriptionData.createdAt ? formatDate(subscriptionData.createdAt) : 'N/A'}
              </div>
              <div>
                <strong>Valid Till:</strong><br />
                {subscriptionData.till ? formatDate(subscriptionData.till) : 'N/A'}
              </div>
              <div><strong>Duration:</strong><br />{subscriptionData.duration || 'N/A'}</div>
              <div><strong>Amount:</strong><br />{subscriptionData.amount || 'N/A'}</div>
            </div>
            {subscriptionData.isCancelled && (
              <div
                style={{
                  marginTop: '24px',
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  color: '#b91c1c',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {userData.fullName} has cancelled the subscription.
              </div>
            )}
          </div>

          <Divider
            style={{ height: 'auto', alignSelf: 'stretch' }}
          />

          {/* MIDDLE: Bots List */}
          <div style={{ flex: 0.8 }}>
            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '16px' }}>
              🤖 Bots Owned
            </h3>
            {botsData.length > 0 ? (
              <div style={{ display: 'grid', gap: '12px' }}>
                {botsData.map((bot) => (
                  <div
                    key={bot.id}
                    style={{
                      background: '#f5f8fa',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #dce0e6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div><strong>Bot Name:</strong> {bot.name}</div>
                      <div><strong>ID:</strong> {bot.id}</div>
                    </div>
                    <Button
                      icon="trash"
                      intent="danger"
                      minimal
                      onClick={async () => {
                        await deleteBot(userData.fullName, userData.email, bot.id)
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontStyle: 'italic', color: '#888' }}>No bots created by this user.</p>
            )}
          </div>

          <Divider
            style={{ height: 'auto', alignSelf: 'stretch' }}
          />

          {/* RIGHT: Transaction History */}
          <div style={{ flex: 1.5 }}>
            <TransactionHistory
              transactions={transactions}
              isLoadingTransactions={isLoadingTransactions}
              fetchTransactions={() => fetchTransactions(userData.email)}
              downloadCSV={downloadCSV}
            />
          </div>
        </div>
      </Dialog>
    </>
  )
}

export default UserCard
