import React from 'react'
import { IoMdBusiness } from 'react-icons/io'

interface OrganizationInfoProps {
  formData: any
  errors: any
  industryData: { industry: string; subIndustries: string[] }[]
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  nextStep: () => void
  prevStep: () => void
}

const OrganizationInfo: React.FC<OrganizationInfoProps> = ({
  formData,
  errors,
  industryData,
  handleChange,
  nextStep,
  prevStep
}) => {
  return (
    <>
      <div className='step'>
        <p className='stepHeader'>Organization Name</p>
        <div className='input-container'>
          <IoMdBusiness className='input-icon' />
          <input
            type='text'
            name='organisationName'
            placeholder='Organisation Name'
            value={formData.organisationName}
            onChange={handleChange}
            className='custom-input'
          />
        </div>
        {errors.organisationName && (
          <span className='error'>{errors.organisationName}</span>
        )}

        <p className='stepHeader'>Industry Type</p>
        <div className='selectbox-container'>
          <select
            name='industryType'
            className='custom-input selectbox-input'
            value={formData.industryType}
            onChange={handleChange}
          >
            <option value=''>Select Industry</option>
            {industryData.map((item, index) => (
              <option key={index} value={item.industry}>
                {item.industry}
              </option>
            ))}
          </select>
        </div>
        {errors.industryType && <span className='error'>{errors.industryType}</span>}

        {formData.industryType && (
          <>
            <p className='stepHeader'>Sub Industry Type</p>
            <div className='selectbox-container'>
              <select
                name='subIndustryType'
                className='custom-input selectbox-input'
                value={formData.subIndustryType}
                onChange={handleChange}
              >
                <option value=''>Select Sub Industry</option>
                {industryData
                  .find((item) => item.industry === formData.industryType)
                  ?.subIndustries.map((subIndustry, index) => (
                    <option key={index} value={subIndustry}>
                      {subIndustry}
                    </option>
                  ))}
              </select>
            </div>
            {errors.subIndustryType && <span className='error'>{errors.subIndustryType}</span>}
          </>
        )}
      </div>
      <div className='button-container'>
        <div className='buttons'>
          <button onClick={prevStep}>Back</button>
          <button onClick={nextStep}>Next</button>
        </div>
      </div>
    </>
  )
}

export default OrganizationInfo
