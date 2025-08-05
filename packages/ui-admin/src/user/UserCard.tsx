import React, { useState } from 'react'
import { Card, Elevation, Icon, Dialog, Button } from '@blueprintjs/core'

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

interface UserCardProps {
  email: string
  userData: UserData
  subscriptionData: SubscriptionData
}

const UserCard: React.FC<UserCardProps> = ({ email, userData, subscriptionData }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleOpenDialog = () => setIsDialogOpen(true)
  const handleCloseDialog = () => setIsDialogOpen(false)

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
          border: `2px solid ${subscriptionData.isCancelled ? 'red' : 'green'}`,
          cursor: 'pointer'
        }}
      >
        {subscriptionData.isCancelled !== undefined && (
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              backgroundColor: subscriptionData.isCancelled ? '#FFCDD2' : '#C8E6C9',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              color: subscriptionData.isCancelled ? '#C62828' : '#2E7D32',
            }}
          >
            {subscriptionData.isCancelled ? 'Cancelled' : 'Active'}
          </div>
        )}
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
        title="User Details"
        style={{ width: '400px' }}
      >
        <div style={{ padding: '20px' }}>
          <h3>User Information</h3>
          <p>
            <strong>Full Name:</strong> {userData.fullName}
          </p>
          <p>
            <strong>Email:</strong> {userData.email}
          </p>
          <p>
            <strong>Phone Number:</strong> {userData.phoneNumber}
          </p>
          <p>
            <strong>Organisation:</strong> {userData.organisationName}
          </p>
          <p>
            <strong>Industry:</strong> {userData.industryType} | {userData.subIndustryType}
          </p>
          <p>
            <strong>Card:</strong> {userData.stripeCustomerId}
          </p>
          <p>
            <strong>Card Expiry:</strong> {userData.stripePayementId}
          </p>
          <p>
            <strong>Number of Bots:</strong> {userData.numberOfBots}
          </p>
          <hr />
          <h3>Subscription Details</h3>
          <p>
            <strong>Plan:</strong> {subscriptionData.subscription}
          </p>
          <p>
            <strong>Created At:</strong> {new Date(subscriptionData.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Valid Till:</strong> {new Date(subscriptionData.till).toLocaleString()}
          </p>
          <p>
            <strong>Duration:</strong> {subscriptionData.duration}
          </p>
          <p>
            <strong>Amount:</strong> {subscriptionData.amount}
          </p>
          {subscriptionData.isCancelled !== undefined && (
            <p>
              <strong>Status:</strong>{' '}
              <span style={{ color: subscriptionData.isCancelled ? 'red' : 'green' }}>
                {subscriptionData.isCancelled ? 'Cancelled' : 'Active'}
              </span>
            </p>
          )}
          <div style={{ textAlign: 'right', marginTop: '20px' }}>
            <Button intent="primary" onClick={handleCloseDialog}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}

export default UserCard
