import React from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import CustomerWizard from './index'

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PROMISE || 'pk_live_51RPPI0EncrURrNgDF2LNkLrh5Wf53SIe3WjqPqjtzqbJWDGfDFeG4VvzUXuC4nCmrPTNOTeFENuAqRBw1mvbNJg600URDxPnuc')

const MainScreen: React.FC = () => {
  return (
    <Elements stripe={stripePromise}>
      <CustomerWizard />
    </Elements>
  )
}

export default MainScreen
