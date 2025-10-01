// Simple React Component Test for CrisisLink
import React from 'react'
import { render } from '@testing-library/react'
import App from '../App'

// Simple App Component Test
describe('CrisisLink App', () => {
  test('renders CrisisLink app without crashing', () => {
    render(<App />)
    // Just check that the app renders without errors
    expect(document.body).toBeInTheDocument()
  })

  test('app contains emergency response elements', () => {
    render(<App />)
    // Check for common emergency response terms
    const content = document.body.textContent || ''
    const hasEmergencyContent =
      content.includes('Crisis') ||
      content.includes('Emergency') ||
      content.includes('SOS') ||
      content.includes('Alert') ||
      content.includes('Help')

    expect(hasEmergencyContent).toBe(true)
  })
})
