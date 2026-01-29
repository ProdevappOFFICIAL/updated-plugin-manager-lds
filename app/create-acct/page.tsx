'use client'

import React, { useState, useEffect } from 'react'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaUser, FaBuilding, FaDesktop, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa'
import { MdAccountCircle } from 'react-icons/md'
import axios from 'axios'

// Add custom CSS for animations
const customStyles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
  }
  
  .animate-fade-in {
    animation: fade-in 0.6s ease-out;
  }
  
  .animate-slide-down {
    animation: slide-down 0.4s ease-out;
  }
  
  .animate-pulse-glow {
    animation: pulse-glow 2s infinite;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = customStyles
  document.head.appendChild(styleSheet)
}

interface CreateAccountFormData {
  fullName: string
  email: string
  organizationName: string
  deviceId: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
}

interface ApiResponse {
  success: boolean
  data?: {
    token: string
    user: {
      id: string
      name: string
      email: string
      school_name: string
      device_id: string
    }
  }
  message?: string
  error?: string
}

export default function CreateAccount() {
  // Form states
  const [formData, setFormData] = useState<CreateAccountFormData>({
    fullName: '',
    email: '',
    organizationName: '',
    deviceId: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  })

  // UI states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // API configuration
  const [backendURL] = useState('https://learningdeck-api.onrender.com') // Backend URL matching main app

  // Auto-generate device ID on component mount
  useEffect(() => {
    const generateDeviceId = async () => {
      try {
        // Try to get device ID from Electron API if available
        if (typeof window !== 'undefined' && (window as any).api?.getDeviceId) {
          const deviceId = await (window as any).api.getDeviceId()
          setFormData(prev => ({ ...prev, deviceId }))
        } else {
          // Fallback: generate a unique device ID
          const fallbackDeviceId = `WEB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          setFormData(prev => ({ ...prev, deviceId: fallbackDeviceId }))
        }
      } catch (error) {
        console.error('Error generating device ID:', error)
        // Use timestamp-based fallback
        const fallbackDeviceId = `DEVICE_${Date.now()}`
        setFormData(prev => ({ ...prev, deviceId: fallbackDeviceId }))
      }
    }

    generateDeviceId()
  }, [])

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null)
        setSuccess(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, success])

  // Handle form input changes
  const handleInputChange = (field: keyof CreateAccountFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Comprehensive form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Full name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please enter a valid email address'
      }
    }

    // Organization name validation
    if (!formData.organizationName.trim()) {
      errors.organizationName = 'School/Organization name is required'
    } else if (formData.organizationName.trim().length < 2) {
      errors.organizationName = 'Organization name must be at least 2 characters'
    }

    // Password validation
    if (!formData.password.trim()) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // Terms agreement validation
    if (!formData.agreeToTerms) {
      errors.agreeToTerms = 'You must agree to the Terms of Service and Privacy Policy'
    }

    // Device ID validation (should be auto-generated)
    if (!formData.deviceId.trim()) {
      errors.deviceId = 'Device ID is required (should be auto-generated)'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Clear messages
  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearMessages()

    if (!validateForm()) {
      setError('Please fix the validation errors below')
      return
    }

    setIsSubmitting(true)

    try {
      const userData = {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        school_name: formData.organizationName.trim(),
        password: formData.password,
        device_id: formData.deviceId.trim()
      }

      console.log('Creating account for:', userData.email)

      const axiosConfig = {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        withCredentials: false
      }

      const response = await axios.post<ApiResponse>(`${backendURL}/api/auth/register`, userData, axiosConfig)

      if (response.data && response.data.success) {
        const { token, user } = response.data.data!

        setSuccess(`Account created successfully for ${user.email}! You can now sign in to LearningDeck.`)
        
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          organizationName: '',
          deviceId: formData.deviceId, // Keep the device ID
          password: '',
          confirmPassword: '',
          agreeToTerms: false
        })

        console.log('Account created successfully:', {
          userId: user.id,
          email: user.email,
          school: user.school_name
        })

        // Optional: Store account info for quick access (without sensitive data)
        const accountInfo = {
          email: user.email,
          name: user.name,
          school: user.school_name,
          createdAt: new Date().toISOString()
        }
        
        // Store in localStorage for reference
        const existingAccounts = JSON.parse(localStorage.getItem('createdAccounts') || '[]')
        existingAccounts.push(accountInfo)
        localStorage.setItem('createdAccounts', JSON.stringify(existingAccounts))

      } else {
        throw new Error(response.data?.message || 'Invalid response from server')
      }
    } catch (error: any) {
      console.error('Account creation error:', error)

      if (error.response) {
        const status = error.response.status
        const errorData = error.response.data
        const message = errorData?.message || errorData?.error

        switch (status) {
          case 400:
            setError(message || 'Invalid registration data. Please check all fields.')
            break
          case 409:
            setError('An account with this email already exists. Please use a different email address.')
            break
          case 429:
            setError('Too many registration attempts. Please try again later.')
            break
          case 500:
            setError('Server error. Please try again later.')
            break
          default:
            setError(message || 'Account creation failed. Please try again.')
        }
      } else if (error.request) {
        if (error.code === 'ECONNABORTED') {
          setError('Request timed out. Please check your connection and try again.')
        } else {
          setError('Network error. Please check your connection and try again.')
        }
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate new device ID
  const generateNewDeviceId = () => {
    const newDeviceId = `MANUAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setFormData(prev => ({ ...prev, deviceId: newDeviceId }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header Messages */}
      {(error || success) && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
          {error && (
            <div className="bg-red-500 text-white px-6 py-3 rounded-lg flex items-center justify-between backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-3">
                <FaExclamationTriangle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
              <button 
                onClick={clearMessages} 
                className="hover:text-red-200 transition-colors duration-200 p-1 rounded-full hover:bg-red-600"
              >
                ×
              </button>
            </div>
          )}
          {success && (
            <div className="bg-green-500 text-white px-6 py-3 rounded-lg flex items-center justify-between backdrop-blur-sm shadow-lg">
              <div className="flex items-center gap-3">
                <FaCheckCircle className="w-5 h-5" />
                <span className="font-medium">{success}</span>
              </div>
              <button 
                onClick={clearMessages} 
                className="hover:text-green-200 transition-colors duration-200 p-1 rounded-full hover:bg-green-600"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      <div className="max-w-md mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 animate-fade-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MdAccountCircle className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Create LearningDeck Account</h1>
            <p className="text-slate-600 text-sm">
              Set up your administrator account to get started with LearningDeck
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Full Name</label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className={`w-full px-4 py-3 pl-10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    validationErrors.fullName ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="Enter your full name"
                  disabled={isSubmitting}
                  autoComplete="name"
                />
              </div>
              {validationErrors.fullName && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.fullName}</p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3 pl-10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    validationErrors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="Enter your email address"
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
              {validationErrors.email && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Organization Name Field */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">School/Organization Name</label>
              <div className="relative">
                <FaBuilding className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  value={formData.organizationName}
                  onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  className={`w-full px-4 py-3 pl-10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    validationErrors.organizationName ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="Enter your school or organization name"
                  disabled={isSubmitting}
                  autoComplete="organization"
                />
              </div>
              {validationErrors.organizationName && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.organizationName}</p>
              )}
            </div>

            {/* Device ID Field */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Device ID</label>
              <div className="relative">
                <FaDesktop className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  value={formData.deviceId}
                  onChange={(e) => handleInputChange('deviceId', e.target.value)}
                  className={`w-full px-4 py-3 pl-10 pr-20 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    validationErrors.deviceId ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="Auto-generated device ID"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={generateNewDeviceId}
                  disabled={isSubmitting}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                >
                  New ID
                </button>
              </div>
              {validationErrors.deviceId && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.deviceId}</p>
              )}
              <p className="text-xs text-slate-500">
                Unique identifier for this device installation
              </p>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-4 py-3 pl-10 pr-10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    validationErrors.password ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="Create a strong password"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {validationErrors.password && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
              )}
              <p className="text-xs text-slate-500">
                Must contain uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`w-full px-4 py-3 pl-10 pr-10 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    validationErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-slate-300'
                  }`}
                  placeholder="Confirm your password"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-1">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  className="w-4 h-4 mt-1 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor="agreeToTerms"
                  className="text-sm text-slate-600 cursor-pointer"
                >
                  I agree to the{' '}
                  <span className="text-blue-600 hover:underline font-medium">Terms of Service</span> and{' '}
                  <span className="text-blue-600 hover:underline font-medium">Privacy Policy</span>
                </label>
              </div>
              {validationErrors.agreeToTerms && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.agreeToTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.agreeToTerms}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <span className="text-blue-600 font-medium cursor-pointer hover:underline">
                Sign in to LearningDeck
              </span>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            This account will have administrator privileges for your LearningDeck installation
          </p>
        </div>
      </div>
    </div>
  )
}