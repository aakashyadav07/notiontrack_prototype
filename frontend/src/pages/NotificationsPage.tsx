import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Mail, Clock, Filter, CheckCircle, XCircle, Trash2, Eye, X } from 'lucide-react';
import { notificationApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

const NOTIFICATION_TYPES = [
  'TIMETABLE_PUBLISHED',
  'EXAM_SCHEDULE_CHANGED',
  'ROOM_CHANGED',
  'SEAT_ALLOCATION_PUBLISHED',
  'CONFLICT_DETECTED',
  'ADMIN_ALERT',
  'SYSTEM',
];

const typeIcons: Record<string, React.ReactNode> = {
  TIMETABLE_PUBLISHED: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  EXAM_SCHEDULE_CHANGED: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  ROOM_CHANGED: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  SEAT_ALLOCATION_PUBLISHED: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  CONFLICT_DETECTED: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z" /></svg>,
  ADMIN_ALERT: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3z" /></svg>,
  SYSTEM: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.065 2.572c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

const typeColors: Record<string, string> = {
  TIMETABLE_PUBLISHED: 'bg-blue-100 text-blue-700',
  EXAM_SCHEDULE_CHANGED: 'bg-yellow-100 text-yellow-700',
  ROOM_CHANGED: 'bg-green-100 text-green-700',
  SEAT_ALLOCATION_PUBLISHED: 'bg-purple-100 text-purple-700',
  CONFLICT_DETECTED: 'bg-red-100 text-red-700',
  ADMIN_ALERT: 'bg-red-100 text-red-700',
  SYSTEM: 'bg-gray-100 text-gray-700',
};

const sampleNotifications = [
  {
    id: '1',
    title: 'Timetable Published',
    message: 'Fall 2024 Final Exams timetable has been published and is now available.',
    type: 'TIMETABLE_PUBLISHED',
    isRead: false,
    createdAt: '2024-12-01T14:30:00Z',
    metadata: { timetableId: '1' },
  },
  {
    id: '2',
    title: 'Exam Schedule Changed',
    message: 'CS101 Programming Fundamentals moved from Dec 15 09:00 to Dec 16 09:00.',
    type: 'EXAM_SCHEDULE_CHANGED',
    isRead: false,
    createdAt: '2024-12-01T10:15:00Z',
    metadata: { examId: '1', oldDate: '2024-12-15', newDate: '2024-12-16' },
  },
  {
    id: '3',
    title: 'Room Changed',
    message: 'CS102 Data Structures moved from R201 to R301.',
    type: 'ROOM_CHANGED',
    isRead: true,
    createdAt: '2024-11-28T16:45:00Z',
    metadata: { examId: '2', oldRoom: 'R201', newRoom: 'R301' },
  },
  {
    id: '4',
    title: 'Seat Allocation Published',
    message: 'Seat allocation for Fall 2024 Final Exams is now available.',
    type: 'SEAT_ALLOCATION_PUBLISHED',
    isRead: false,
    createdAt: '2024-11-25T09:00:00Z',
    metadata: { timetableId: '1' },
  },
  {
    id: '5',
    title: 'Conflict Detected',
    message: 'Student CS2023001 has conflicting exams on Dec 15 at 09:00.',
    type: 'CONFLICT_DETECTED',
    isRead: false,
    createdAt: '2024-11-20T11:30:00Z',
    metadata: { conflictId: '1' },
  },
];

const unreadCount = sampleNotifications.filter(n => !n.isRead).length;

function renderNotificationItem(
  notification: typeof sampleNotifications[0],
  markAsReadMutation: any,
  deleteMutation: any,
  setSelectedNotification: (n: any) => void
) {
  return (
    <div
      key={notification.id}
      className={`p-4 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-blue-50' : ''}`}
      onClick={() => setSelectedNotification(notification)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeColors[notification.type]}`}>
              {typeIcons[notification.type]}
            </div>
            <div>
              <h4 className={`font-medium ${!notification.isRead ? 'font-semibold' : ''} text-gray-900`}>
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`badge ${notification.isRead ? 'badge-gray' : 'badge-primary'}`}>
              {notification.type.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {format(new Date(notification.createdAt), 'MMM d, yyyy HH:mm')}
            </span>
            {!notification.isRead && (
              <button
                onClick={(e) => { e.stopPropagation(); markAsReadMutation.mutate(notification.id); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                title="Mark as read"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notification.id); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('');
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [selectedNotification, setSelectedNotification] = useState<any>(null);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list(),
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const filteredNotifications = sampleNotifications.filter(n => {
    const matchesType = !filterType || n.type === filterType;
    const matchesRead = filterRead === 'all' || (filterRead === 'read' && n.isRead) || (filterRead === 'unread' && !n.isRead);
    return matchesType && matchesRead;
  });

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllReadMutation.mutate();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this notification?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-gray-600 mt-1">Stay updated with important alerts and changes</p>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn-secondary"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All as Read
            </button>
          )}
          <span className={`badge ${unreadCount > 0 ? 'badge-danger' : 'badge-success'}`}>
            {unreadCount} Unread
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search notifications..."
                className="input pl-10"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input w-auto sm:w-48"
            >
              <option value="">All Types</option>
              {NOTIFICATION_TYPES.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={filterRead}
              onChange={(e) => setFilterRead(e.target.value as any)}
              className="input w-auto sm:w-32"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="card">
        <div className="card-body p-0">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                return renderNotificationItem(notification, markAsReadMutation, deleteMutation, setSelectedNotification);
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedNotification(null)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-lg font-semibold">Notification Details</h3>
                <button onClick={() => setSelectedNotification(null)} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${typeColors[selectedNotification.type]}`}>
                    {typeIcons[selectedNotification.type]}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${!selectedNotification.isRead ? 'font-bold' : ''} text-gray-900`}>
                      {selectedNotification.title}
                    </h4>
                    <span className={`badge ${typeColors[selectedNotification.type]}`}>
                      {selectedNotification.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900">{selectedNotification.message}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium mb-2">Metadata</h5>
                  <pre className="text-sm text-gray-600 bg-white p-3 rounded overflow-auto">
                    {JSON.stringify(selectedNotification.metadata, null, 2)}
                  </pre>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-500">
                    Received {format(new Date(selectedNotification.createdAt), 'MMMM d, yyyy at HH:mm')}
                  </span>
                  <div className="flex items-center space-x-3">
                    {!selectedNotification.isRead && (
                      <button
                        onClick={() => markAsReadMutation.mutate(selectedNotification.id)}
                        className="btn-primary btn-sm"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Read
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(selectedNotification.id); }}
                      className="btn-secondary btn-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}