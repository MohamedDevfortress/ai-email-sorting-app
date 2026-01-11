import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccountSwitcher from '../AccountSwitcher';

// Mock the API module
const mockApiGet = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    get: mockApiGet,
  },
}));

describe('AccountSwitcher Component', () => {
  const mockToken = 'mock-jwt-token';
  const mockAccounts = [
    { id: '1', email: 'user1@example.com', name: 'User 1' },
    { id: '2', email: 'user2@example.com', name: 'User 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', mockToken);
    
    // Mock successful API response by default
    mockApiGet.mockResolvedValue(mockAccounts);
  });

  it('should render without crashing', async () => {
    render(<AccountSwitcher token={mockToken} />);
    
    // Wait for accounts to load
    await waitFor(() => {
      expect(screen.queryByText('Loading accounts...')).not.toBeInTheDocument();
    });
    
    // Should render a trigger button after loading
    const trigger = screen.getByRole('button');
    expect(trigger).toBeInTheDocument();
  });

  it('should display avatar after loading', async () => {
    render(<AccountSwitcher token={mockToken} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading accounts...')).not.toBeInTheDocument();
    });
    
    // Avatar button should be visible
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    // Mock fetch to delay response
    global.fetch = vi.fn().mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );
    
    render(<AccountSwitcher token={mockToken} />);
    
    // Should show loading initially
    expect(screen.getByText('Loading accounts...')).toBeInTheDocument();
  });
  
  it('should show "no accounts" message when empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    
    render(<AccountSwitcher token={mockToken} />);
    
    await waitFor(() => {
      expect(screen.getByText('No connected accounts')).toBeInTheDocument();
    });
  });
});
