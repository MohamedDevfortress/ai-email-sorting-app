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

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchEmails = async (categoryId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/emails`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Filter by category (backend should ideally support this)
        const filtered = data.filter((email: Email & { categoryId: string }) => email.categoryId === categoryId);
        setEmails(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    }
  };

  const handleAddCategory = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newCategory),
      });
      if (res.ok) {
        setIsAddCategoryOpen(false);
        setNewCategory({ name: '', description: '' });
        fetchCategories();
      }
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
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

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/emails/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emailIds: Array.from(selectedEmails) }),
      });

      if (res.ok) {
        setSelectedEmails(new Set());
        if (selectedCategory) {
          fetchEmails(selectedCategory);
        }
      }
    } catch (error) {
      console.error('Failed to delete emails:', error);
    }
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
                            disabled
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
    </div>
  );
}
