import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import {
  Users, Calendar, Building, AlertTriangle, UserCheck,
  TrendingUp, Clock, Bell, Plus, Download, Filter,
  ChevronRight, ChevronLeft
} from 'lucide-react';
import { reportApi, notificationApi } from '../api';
import type { Notification, PaginatedResponse } from '../types/timetable';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatRelativeTime } from '../utils/formatters';

interface DashboardData {
  totalStudents: number;
  totalFaculty: number;
  totalRooms: number;
  totalExams: number;
  upcomingExams: Array<{
    id: string;
    subject: string;
    sessions: Array<{
      id: string;
      date: string;
      startTime: string;
      endTime: string;
      room: { code: string; name: string };
    }>;
  }>;
}

interface UpcomingExam {
  id: string;
  subject: string;
  sessions: Array<{
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    room: { code: string; name: string };
  }>;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportApi.getDashboard() as Promise<any>,
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery<PaginatedResponse<Notification>>({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.list({ limit: 5 }),
    refetchInterval: 30000,
  });

  const stats = [
    { label: 'Total Students', value: dashboard?.totalStudents || 0, icon: Users, color: 'icon-primary', trend: '+2.1%' },
    { label: 'Total Exams', value: dashboard?.totalExams || 0, icon: Calendar, color: 'icon-info', trend: '+5' },
    { label: 'Active Rooms', value: dashboard?.totalRooms || 0, icon: Building, color: 'icon-success', trend: '0' },
    { label: 'Pending Conflicts', value: dashboard?.conflicts || 0, icon: AlertTriangle, color: dashboard?.conflicts ? 'icon-danger' : 'icon-success', trend: dashboard?.conflicts ? '⚠️' : '✓' },
    { label: 'Faculty Members', value: dashboard?.totalFaculty || 0, icon: UserCheck, color: 'icon-warning', trend: '+1' },
  ];

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate), i));

  const getExamsForDay = (date: Date) => {
    if (!dashboard?.upcomingExams) return [];
    return dashboard.upcomingExams.filter((exam: any) =>
      exam.sessions.some((session: any) => format(new Date(session.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
    );
  };

  const prevWeek = () => setSelectedDate(d => addDays(d, -7));
  const nextWeek = () => setSelectedDate(d => addDays(d, 7));
  const goToday = () => setSelectedDate(new Date());

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back! Here's what's happening with your examinations.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Generate Timetable
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="stat-label">{stat.label}</p>
                <p className="stat-value">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.trend}</p>
              </div>
              <div className={`stat-icon ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
                <div className="flex items-center space-x-2">
                  <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
                  </span>
                  <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button onClick={goToday} className="btn-secondary btn-sm">
                    <Calendar className="w-4 h-4 mr-1" />
                    Today
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="w-24">Time</th>
                      {weekDays.map((day, i) => (
                        <th key={i} className={`text-center ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary-50' : ''}`}>
                          <div className={`py-2 px-1 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary-100 text-primary-700 rounded-lg' : ''}`}>
                            <p className="text-xs text-gray-500">{format(day, 'EEE')}</p>
                            <p className={`font-semibold ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-primary-700' : ''}`}>
                              {format(day, 'd')}
                            </p>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const timeSlots = [
                        '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
                        '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00',
                        '16:00-17:00', '17:00-18:00'
                      ];
                      return timeSlots.map((slot) => (
                        <tr key={slot}>
                          <td className="text-sm text-gray-500 font-medium py-2 px-4">{slot}</td>
                          {weekDays.map((day) => (
                            <td key={day.toISOString()} className="relative">
                              {(() => {
                                const exams = getExamsForDay(day);
                                const matchingExams = exams.filter((exam: any) =>
                                  exam.sessions.some((session: any) => {
                                    const sessionDate = format(new Date(session.date), 'yyyy-MM-dd');
                                    return sessionDate === format(day, 'yyyy-MM-dd');
                                  })
                                );
                                if (matchingExams.length === 0) return null;
                                return matchingExams.slice(0, 2).map((exam: any) => (
                                  <div key={exam.id} className="mb-1 p-1.5 bg-primary-50 border border-primary-200 rounded text-xs">
                                    <p className="font-medium text-primary-800 truncate">{exam.subject}</p>
                                    {exam.sessions.map((s: any) => (
                                      <p key={s.id} className="text-xs text-primary-600 truncate">
                                        {s.room?.code} {s.startTime}-{s.endTime}
                                      </p>
                                    ))}
                                  </div>
                                ));
                              })()}
                            </td>
                          ))}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Upcoming Exams */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Exams</h2>
              <button className="btn-ghost btn-sm">View All</button>
            </div>
            <div className="card-body p-0">
              <div className="divide-y divide-gray-200">
                {dashboard?.upcomingExams?.slice(0, 5).map((exam: any) => (
                  <div key={exam.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{exam.subject}</p>
                        <p className="text-sm text-gray-500">
                          {exam.sessions.map((s: any) => `${format(new Date(s.date), 'MMM d')} at ${s.startTime}-${s.endTime} in ${s.room?.code}`).join(', ')}
                        </p>
                      </div>
                      <span className="badge badge-info">Upcoming</span>
                    </div>
                  </div>
                ))}
                {(!dashboard?.upcomingExams || dashboard.upcomingExams.length === 0) && (
                  <div className="p-8 text-center text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p>No upcoming exams scheduled</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Room Utilization */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Room Utilization</h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Overall Utilization</span>
                    <span className="font-semibold text-gray-900">{dashboard?.roomUtilization || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${dashboard?.roomUtilization || 0}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{dashboard?.scheduledExams || 0}</p>
                    <p className="text-xs text-gray-500">Scheduled</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{dashboard?.pendingExams || 0}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="card-body">
              <div className="space-y-2">
                <button className="btn-secondary w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Timetable
                </button>
                <button className="btn-secondary w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Allocate Seats
                </button>
                <button className="btn-secondary w-full justify-start">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assign Invigilators
                </button>
                <button className="btn-secondary w-full justify-start">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Resolve Conflicts
                </button>
                <button className="btn-secondary w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Reports
                </button>
              </div>
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Notifications</h2>
              <button className="btn-ghost btn-sm">View All</button>
            </div>
            <div className="card-body p-0">
              <div className="divide-y divide-gray-200">
                {notifications?.data?.slice(0, 3).map((notification: any) => (
                  <div key={notification.id} className={`p-4 ${!notification.isRead ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${!notification.isRead ? 'font-semibold' : ''} text-gray-900 truncate`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 truncate">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                      <span className={`badge ${notification.isRead ? 'badge-gray' : 'badge-info'}`}>
                        {notification.type}
                      </span>
                    </div>
                  </div>
                ))}
                {(!notifications?.data || notifications.data.length === 0) && (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                    <p>No notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

