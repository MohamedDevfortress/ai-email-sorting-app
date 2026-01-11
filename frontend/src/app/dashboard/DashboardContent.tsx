import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Mail, LogOut } from 'lucide-react';
import AccountSwitcher from '@/components/AccountSwitcher';
import EmailDetailModal from '@/components/EmailDetailModal';
import ScreenshotModal from '@/components/ScreenshotModal';
import { api } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  description: string;
}

interface Email {
  id: string;
  subject: string;
  sender: string;
  summary: string;
  receivedAt: string;
}

export default function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [unsubscribeJobId, setUnsubscribeJobId] = useState<string | null>(null);
  const [unsubscribeProgress, setUnsubscribeProgress] = useState<any>(null);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [pageLimit] = useState(20);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      localStorage.setItem('token', tokenFromUrl);
      // Clean URL
      window.history.replaceState({}, '', '/dashboard');
    } else {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      } else {
        router.push('/');
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (token) {
      fetchCategories();
    }
  }, [token]);

  useEffect(() => {
    if (token && selectedCategory) {
      fetchEmails(selectedCategory);
    }
  }, [token, selectedCategory]);

  // Handle API errors (especially 401 unauthorized)
  const handleApiError = (response: Response) => {
    if (response.status === 401) {
      console.log('Token expired, logging out...');
      localStorage.removeItem('token');
      router.push('/');
      return true;
    }
    return false;
  };

  const fetchCategories = async () => {
    const data = await api.get<Category[]>('/categories', { token: token!, router });
    if (data) {
      setCategories(data);
    }
  };

  const fetchEmails = async (categoryId: string, page: number = 1) => {
    const data = await api.get<{
      data: (Email & { categoryId: string })[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`/emails?categoryId=${categoryId}&page=${page}&limit=${pageLimit}`, { token: token!, router });
    
    if (data) {
      setEmails(data.data);
      setCurrentPage(data.meta.page);
      setTotalPages(data.meta.totalPages);
      setTotalEmails(data.meta.total);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;

    const result = await api.post('/categories', newCategory, { token: token!, router });
    if (result) {
      setNewCategory({ name: '', description: '' });
      setIsAddCategoryOpen(false);
      fetchCategories();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleDeleteCategory = async (categoryId: string) => {
    localStorage.removeItem('token');
    router.push('/');
  };

  const handleOpenCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // Reset to first page when changing category
    fetchEmails(categoryId, 1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && selectedCategory) {
      setCurrentPage(newPage);
      fetchEmails(selectedCategory, newPage);
    }
  };

  const handleSelectAll = () => {
    if (selectedEmails.size === emails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(emails.map(e => e.id)));
    }
  };

  const handleSelectEmail = (emailId: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) return;
    
    if (!confirm(`Delete ${selectedEmails.size} email(s)?`)) return;

    const result = await api.deleteWithBody('/emails/bulk', 
      { emailIds: Array.from(selectedEmails) }, 
      { token: token!, router }
    );
    
    if (result) {
      setSelectedEmails(new Set());
      if (selectedCategory) {
        await fetchEmails(selectedCategory);
      }
    }
  };

  const handleBulkUnsubscribe = async () => {
    if (selectedEmails.size === 0) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    if (!confirm(`Attempt to unsubscribe from ${selectedEmails.size} email sender(s)? This will use AI to automatically navigate unsubscribe links.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/emails/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      });

      const data = await res.json();

      if (data.success && data.jobId) {
        setUnsubscribeJobId(data.jobId);
        setShowUnsubscribeModal(true);
        pollUnsubscribeStatus(data.jobId);
      } else {
        alert('Failed to start unsubscribe process');
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      alert('Failed to start unsubscribe process');
    }
  };

  const pollUnsubscribeStatus = async (jobId: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/emails/unsubscribe/status/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const status = await res.json();
        setUnsubscribeProgress(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
          
          // Extract screenshot from first result that has one
          if (status.result?.results) {
            const resultWithScreenshot = status.result.results.find((r: any) => r.screenshot);
            if (resultWithScreenshot) {
              setScreenshot(resultWithScreenshot.screenshot);
            }
          }
          
          // Refresh email list
          if (selectedCategory) {
            fetchEmails(selectedCategory);
          }
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
  };

  if (!token) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">AI Email Sorter</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <div className="md:col-span-1 space-y-6">
            {/* Account Switcher */}
            <AccountSwitcher token={token} />

            {/* Categories Sidebar */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Categories</CardTitle>
                  <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                        <DialogDescription>
                          Create a new category to organize your emails
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            className='my-2'
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            placeholder="e.g., Newsletters"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            className='my-2'
                            value={newCategory.description}
                            onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                            placeholder="Describe what emails belong in this category..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleAddCategory}>Create Category</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No categories yet</p>
                ) : (
                  categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Emails List */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>
                      {selectedCategory
                        ? categories.find((c) => c.id === selectedCategory)?.name || 'Emails'
                        : 'Select a category'}
                    </CardTitle>
                    <CardDescription>
                      {selectedCategory ? `${emails.length} emails` : 'Choose a category to view emails'}
                    </CardDescription>
                  </div>
                  
                  {/* Bulk Actions */}
                  {selectedCategory && emails.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        {selectedEmails.size === emails.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      
                      {selectedEmails.size > 0 && (
                        <>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                          >
                            Delete ({selectedEmails.size})
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBulkUnsubscribe}
                          >
                            Unsubscribe ({selectedEmails.size})
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedCategory ? (
                  <div className="text-center py-12 text-gray-500">
                    <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Select a category to view your emails</p>
                  </div>
                ) : emails.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No emails in this category yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {emails.map((email) => (
                      <div 
                        key={email.id} 
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors flex gap-3"
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(email.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectEmail(email.id);
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300"
                        />
                        
                        {/* Email Content */}
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedEmailId(email.id);
                            setIsEmailModalOpen(true);
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium">{email.subject}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {new Date(email.receivedAt).toLocaleDateString()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">From: {email.sender}</p>
                          <p className="text-sm text-gray-700">{email.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}

                  {/* Pagination Controls */}
                  {selectedCategory && totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between border-t pt-4">
                      <div className="text-sm text-gray-600">
                        Showing {emails.length} of {totalEmails} emails
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = currentPage <= 3 
                              ? i + 1 
                              : currentPage >= totalPages - 2
                              ? totalPages - 4 + i
                              : currentPage - 2 + i;
                            
                            if (pageNum < 1 || pageNum > totalPages) return null;
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
        </div>
      </main>

      {/* Email Detail Modal */}
      {selectedEmailId && token && (
        <EmailDetailModal
          emailId={selectedEmailId}
          token={token}
          isOpen={isEmailModalOpen}
          onClose={() => {
            setIsEmailModalOpen(false);
            setSelectedEmailId(null);
          }}
        />
      )}

      {/* Unsubscribe Progress Modal */}
      {showUnsubscribeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Unsubscribing...</h3>
              <button
                onClick={() => {
                  setShowUnsubscribeModal(false);
                  setUnsubscribeJobId(null);
                  setUnsubscribeProgress(null);
                  setSelectedEmails(new Set());
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {unsubscribeProgress ? (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Status:</span>
                  <span className="font-medium capitalize">{unsubscribeProgress.status}</span>
                </div>
                
                {unsubscribeProgress.progress !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress:</span>
                      <span className="font-medium">{unsubscribeProgress.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${unsubscribeProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {unsubscribeProgress.result && (
                  <div className="mt-4 p-4 bg-gray-50 rounded text-sm">
                    <div className="font-medium mb-2">Results:</div>
                    <div>Total: {unsubscribeProgress.result.total}</div>
                    <div className="text-green-600">Successful: {unsubscribeProgress.result.successful}</div>
                    <div className="text-red-600">Failed: {unsubscribeProgress.result.failed}</div>
                    
                    {/* Show failed emails with links */}
                    {unsubscribeProgress.result.results && 
                     unsubscribeProgress.result.results.filter((r: any) => !r.success && r.link).length > 0 && (
                      <div className="mt-3 border-t pt-3">
                        <div className="font-medium mb-2 text-gray-700">Manual Unsubscribe:</div>
                        <div className="space-y-2">
                          {unsubscribeProgress.result.results
                            .filter((r: any) => !r.success && r.link)
                            .map((r: any, idx: number) => (
                              <div key={idx} className="text-xs">
                                <a 
                                  href={r.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <span>Click to unsubscribe manually</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                                {r.isCloudflare && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 ml-2 mt-1">
                                    🛡️ Cloudflare Protected
                                  </span>
                                )}
                                {r.error && (
                                  <div className="text-gray-500 ml-4 mt-1">
                                    Reason: {r.isCloudflare ? "Site uses anti-bot protection" : r.error}
                                  </div>
                                )}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {unsubscribeProgress.status === 'completed' && (
                  <div className="text-green-600 text-sm">
                    ✓ Unsubscribe process completed
                  </div>
                )}

                {unsubscribeProgress.status === 'failed' && (
                  <div className="text-red-600 text-sm">
                    ✗ Unsubscribe process failed
                  </div>
                )}

                {/* Close button when completed or failed */}
                {(unsubscribeProgress.status === 'completed' || unsubscribeProgress.status === 'failed') && (
                  <div className="space-y-2 mt-4">
                    {screenshot && (
                      <button
                        onClick={() => setShowScreenshotModal(true)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        View Screenshot
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowUnsubscribeModal(false);
                        setUnsubscribeJobId(null);
                        setUnsubscribeProgress(null);
                        setSelectedEmails(new Set());
                        setScreenshot(null);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Initializing...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      <ScreenshotModal 
        screenshot={screenshot}
        onClose={() => setShowScreenshotModal(false)}
      />
    </div>
  );
}
