import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Bell, Shield, Palette, Globe, Download, LogOut, Eye, EyeOff, CheckCircle, Trash2 } from 'lucide-react';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'preferences', label: 'Preferences', icon: Globe },
];

export default function SettingsPage() {
  const { user, changePassword, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await logout();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>
      </div>

      {/* Profile Header */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-700">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.email}</h2>
              <p className="text-gray-500 capitalize mt-1">{user?.role}</p>
              <p className="text-sm text-gray-400 mt-1">Member since {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : 'N/A'}</p>
            </div>
            <div className="ml-auto">
              <button onClick={handleLogout} className="btn-danger">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Settings tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="card-body pt-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" defaultValue={user?.email} disabled />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="label">Role</label>
                  <input type="text" className="input" value={user?.role} disabled />
                </div>
                <div>
                  <label className="label">Status</label>
                  <input type="text" className="input" value="Active" disabled />
                </div>
                <div>
                  <label className="label">Last Login</label>
                  <input type="text" className="input" value="Today, 10:30 AM" disabled />
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Security Tip:</strong> Use a unique, strong password. Consider using a password manager.
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm animate-fade-in">
                    {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm animate-fade-in">
                    {passwordSuccess}
                  </div>
                )}

                <div>
                  <label className="label">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="input pr-10"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="input pr-10"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
                </div>

                <div>
                  <label className="label">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="input pr-10"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}

                <div className="pt-4">
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Changing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Management</h3>
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">Active Sessions</p>
                      <p className="text-sm text-gray-500">1 active session (this device)</p>
                    </div>
                    <span className="badge badge-success">Current</span>
                  </div>
                  <button className="btn-secondary w-full justify-start">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout from All Devices
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
              <p className="text-gray-600">Choose which notifications you want to receive</p>

              <div className="space-y-4">
                {[
                  { id: 'timetable', label: 'Timetable Published', description: 'When a new timetable is published' },
                  { id: 'schedule', label: 'Exam Schedule Changes', description: 'When your exam schedule is modified' },
                  { id: 'room', label: 'Room Changes', description: 'When your assigned room changes' },
                  { id: 'seats', label: 'Seat Allocation', description: 'When seat allocations are published' },
                  { id: 'conflicts', label: 'Conflict Alerts', description: 'When conflicts are detected in your schedule' },
                  { id: 'admin', label: 'Admin Alerts', description: 'Important system announcements' },
                ].map((pref) => (
                  <label key={pref.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" defaultChecked className="w-4 h-4 text-primary-600 rounded" />
                      <div>
                        <p className="font-medium text-gray-900">{pref.label}</p>
                        <p className="text-sm text-gray-500">{pref.description}</p>
                      </div>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary-600 rounded" />
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium mb-3">Email Preferences</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-500">Receive email copies of in-app notifications</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5 text-primary-600 rounded" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Weekly Digest</p>
                      <p className="text-sm text-gray-500">Receive a weekly summary of upcoming exams</p>
                    </div>
                    <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Theme</h3>
              <div className="grid grid-cols-3 gap-4">
                {['Light', 'Dark', 'System'].map((theme) => (
                  <label key={theme} className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    theme === 'Light' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'
                  }`}>
                    <input type="radio" name="theme" value={theme} className="sr-only" defaultChecked={theme === 'Light'} />
                    <div className="text-center">
                      <div className={`w-16 h-16 rounded-lg mx-auto mb-3 ${theme === 'Dark' ? 'bg-gray-800' : 'bg-white border-2 border-gray-200'}`}>
                        <div className={`w-full h-full flex items-center justify-center ${theme === 'Dark' ? 'text-white' : 'text-gray-600'}`}>
                          {theme === 'Dark' ? '🌙' : theme === 'Dark' ? '🌙' : '☀️'}
                        </div>
                      </div>
                      <p className="font-medium text-gray-900">{theme}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Density</h3>
                <div className="grid grid-cols-3 gap-4">
                  {['Comfortable', 'Compact', 'Spacious'].map((density) => (
                    <label key={density} className="relative p-4 border-2 rounded-xl cursor-pointer border-gray-200 hover:border-primary-300">
                      <input type="radio" name="density" value={density} className="sr-only" defaultChecked={density === 'Comfortable'} />
                      <div className="text-center">
                        <p className="font-medium text-gray-900">{density}</p>
                        <p className="text-sm text-gray-500 mt-1">Default spacing</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-900">Language & Region</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Language</label>
                  <select className="input">
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
                <div>
                  <label className="label">Time Zone</label>
                  <select className="input">
                    <option>UTC-05:00 (Eastern Time)</option>
                    <option>UTC-06:00 (Central Time)</option>
                    <option>UTC-07:00 (Mountain Time)</option>
                    <option>UTC-08:00 (Pacific Time)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date Format</label>
                  <select className="input">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="label">Time Format</label>
                  <select className="input">
                    <option>12-hour (AM/PM)</option>
                    <option>24-hour</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Default Views</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Default Timetable View</label>
                    <select className="input w-auto">
                      <option>Calendar</option>
                      <option>Table</option>
                      <option>List</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Default Page Size</label>
                    <select className="input w-auto">
                      <option>10</option>
                      <option>20</option>
                      <option>50</option>
                      <option>100</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
                <div className="space-y-3">
                  <button className="btn-secondary w-full sm:w-auto justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Export My Data
                  </button>
                  <button className="btn-secondary w-full sm:w-auto justify-start text-red-600 hover:bg-red-50 border-red-200">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Need to import format
import { format } from 'date-fns';