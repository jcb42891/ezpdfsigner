import { render, screen } from '@testing-library/react'
import App from '@/App'

describe('app shell', () => {
  it('renders empty-state prompt before loading a PDF', () => {
    render(<App />)

    expect(screen.getByText(/Open a PDF to start editing/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Upload PDF/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Default text size/i)).toBeInTheDocument()
  })
})
