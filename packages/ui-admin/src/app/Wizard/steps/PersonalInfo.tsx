import React from 'react'
import { IoMdPerson, IoMdMail, IoIosCall, IoIosLock, IoMdEye, IoMdEyeOff } from 'react-icons/io'

interface PersonalInfoProps {
  formData: any
  errors: any
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  togglePasswordVisibility: () => void
  showPassword: boolean
  countryOptions: { code: string; name: string }[]
  nextStep: () => void
  isLoading: boolean
  history: any
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({
  formData,
  errors,
  handleChange,
  togglePasswordVisibility,
  showPassword,
  countryOptions,
  nextStep,
  isLoading,
  history
}) => {
  return (
    <>
      <div className='step'>
        <p className='stepHeader'>Personal Information</p>
        <div className='input-container'>
          <IoMdPerson className='input-icon' />
          <input
            type='text'
            name='fullName'
            placeholder='Full Name'
            value={formData.fullName}
            onChange={handleChange}
            className='custom-input'
          />
        </div>
        {errors.fullName && (
          <span className='error'>{errors.fullName}</span>
        )}

        <div className='input-container'>
          <IoMdMail className='input-icon' />
          <input
            type='email'
            name='email'
            placeholder='Email'
            value={formData.email}
            onChange={handleChange}
            className='custom-input'
          />
        </div>
        {errors.email && <span className='error'>{errors.email}</span>}

        <div className='input-container' style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IoIosCall className='input-icon' />
          <select
            name='countryCode'
            value={formData.countryCode}
            onChange={handleChange}
            style={{
              width: 60,
              minWidth: 60,
              fontSize: 15,
              padding: '4px 4px',
              border: 'none',
              borderRadius: 4,
              background: '#f9f9f9',
              textAlign: 'center'
            }}
          >
            {countryOptions.map(opt => (
              <option key={opt.code} value={opt.code} label={`${opt.code} (${opt.name})`}>
                {opt.code}
              </option>
            ))}
          </select>
          <div style={{
            width: 1,
            height: 24,
            background: '#ccc',
            margin: '0 6px'
          }} />
          <input
            type='tel'
            name='phoneNumber'
            placeholder='Phone Number'
            value={formData.phoneNumber}
            onChange={handleChange}
            className='custom-input'
            style={{ flex: 1 }}
          />
        </div>
        {errors.countryCode && <span className='error'>{errors.countryCode}</span>}
        {errors.phoneNumber && (
          <span className='error'>{errors.phoneNumber}</span>
        )}

        <div className='input-container'>
          <IoIosLock className='input-icon' />
          <input
            type={showPassword ? 'text' : 'password'}
            name='password'
            placeholder='Password'
            value={formData.password}
            onChange={handleChange}
            className='custom-input'
          />
          <span className='eye-icon' onClick={togglePasswordVisibility}>
            {showPassword ? <IoMdEyeOff /> : <IoMdEye />}
          </span>
        </div>
        {errors.password && <span className='error'>{errors.password}</span>}
      </div>
      <div className='button-container'>
        <button className='nextButton' onClick={nextStep} disabled={isLoading}>
          Next
        </button>
      </div>
      {(isLoading) && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <div className='loader'></div>
            <p>Email is getting checked... Please wait.</p>
          </div>
        </div>
      )}
    </>
  )
}

export default PersonalInfo
