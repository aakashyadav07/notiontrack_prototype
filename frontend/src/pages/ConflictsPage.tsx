import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, AlertTriangle, CheckCircle, XCircle, Download, MoreHorizontal, ChevronRight, X, RefreshCw } from 'lucide-react';
import { conflictApi, timetableApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const CONFLICT_TYPE_COLORS: Record<string, string> = {
  STUDENT_TIME_CONFLICT: 'badge-danger',
  ROOM_DOUBLE_BOOKING: 'badge-warning',
  FACULTY_DOUBLE_BOOKING: 'badge-danger',
  ROOM_CAPACITY_EXCEEDED: 'badge-danger',
  MISSING_ROOM: 'badge-warning',
  MISSING_INVIGILATOR: 'badge-info',
  INVALID_TIME_SLOT: 'badge-gray',
  DUPLICATE_ALLOCATION: 'badge-danger',
  INVALID_REGISTRATION: 'badge-warning',
  EXAM_OUTSIDE_PERIOD: 'badge-gray',
};

const SEVERITY_COLORS: Record<string, string> = {
  LOW: 'badge-gray',
  MEDIUM: 'badge-info',
  HIGH: 'badge-warning',
  CRITICAL: 'badge-danger',
};

const conflictTypes = [
  'STUDENT_TIME_CONFLICT',
  'ROOM_DOUBLE_BOOKING',
  'FACULTY_DOUBLE_BOOKING',
  'ROOM_CAPACITY_EXCEEDED',
  'MISSING_ROOM',
  'MISSING_INVIGILATOR',
  'INVALID_TIME_SLOT',
  'DUPLICATE_ALLOCATION',
  'INVALID_REGISTRATION',
  'EXAM_OUTSIDE_PERIOD',
];

function renderActions(
  conflict: any,
  handleResolve: (id: string, action: string, data?: any) => void,
  showResolution: string | null,
  setShowResolution: (id: string | null) => void
) {
  if (!conflict.isResolved) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleResolve(conflict.id, 'MOVE_EXAM')}
          className="p-2 rounded-lg hover:bg-gray-100 text-blue-600"
          title="Move Exam"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l6-6 6 6m0 12l-6-6-6 6" /></svg>
        </button>
        <button
          onClick={() => handleResolve(conflict.id, 'CHANGE_ROOM')}
          className="p-2 rounded-lg hover:bg-gray-100 text-green-600"
          title="Change Room"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </button>
        <button
          onClick={() => handleResolve(conflict.id, 'IGNORE')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          title="Ignore"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    );
  }
  return <span className="text-sm text-green-600">Resolved</span>;
}

export default function ConflictsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timetableFilter, setTimetableFilter] = useState('');
  const [showResolution, setShowResolution] = useState<string | null>(null);
  const [resolutionConflict, setResolutionConflict] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data: timetables } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => timetableApi.list(),
  });

  const { data: conflictsData, isLoading, refetch } = useQuery({
    queryKey: ['conflicts', timetableFilter],
    queryFn: () => conflictApi.list({ timetableId: timetableFilter || undefined }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ conflictId, action, data }: { conflictId: string; action: string; data?: any }) =>
      conflictApi.resolve(conflictId, { action: action as any, notes: resolutionNotes, ...data }),
    onSuccess: () => {
      toast.success('Conflict resolved successfully!');
      refetch();
      setShowResolution(null);
      setResolutionConflict(null);
      setResolutionNotes('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const detectMutation = useMutation({
    mutationFn: (timetableId: string) => conflictApi.detect(timetableId),
    onSuccess: () => {
      toast.success('Conflict detection started!');
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleResolve = (conflictId: string, action: string, data?: any) => {
    const conflict = conflictsData?.data?.find(c => c.id === conflictId);
    if (!conflict) return;

    if (action === 'MOVE_EXAM' || action === 'CHANGE_ROOM' || action === 'CHANGE_TIME') {
      setResolutionConflict({ ...conflict, resolutionAction: action });
      setShowResolution(conflictId);
    } else {
      resolveMutation.mutate({ conflictId, action });
    }
  };

  const handleConfirmResolution = () => {
    if (!resolutionConflict) return;
    resolveMutation.mutate({
      conflictId: resolutionConflict.id,
      action: resolutionConflict.resolutionAction,
      ...resolutionConflict.resolutionData,
    });
  };

  const handleRunDetection = () => {
    if (!timetableFilter) {
      toast.error('Please select a timetable');
      return;
    }
    detectMutation.mutate(timetableFilter);
  };

  const filteredConflicts = conflictsData?.data?.filter(c => {
    const matchesSearch = c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.entityId?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || c.type === typeFilter;
    const matchesSeverity = !severityFilter || c.severity === severityFilter;
    const matchesStatus = !statusFilter ||
      (statusFilter === 'resolved' && c.isResolved) ||
      (statusFilter === 'unresolved' && !c.isResolved);
    return matchesSearch && matchesType && matchesSeverity && matchesStatus;
  }) || [];

  const stats = {
    total: conflictsData?.data?.length || 0,
    critical: conflictsData?.data?.filter(c => c.severity === 'CRITICAL').length || 0,
    high: conflictsData?.data?.filter(c => c.severity === 'HIGH').length || 0,
    resolved: conflictsData?.data?.filter(c => c.isResolved).length || 0,
    unresolved: conflictsData?.data?.filter(c => !c.isResolved).length || 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Conflict Resolution Center</h1>
          <p className="text-gray-600 mt-1">Detect, review, and resolve scheduling conflicts</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timetableFilter}
            onChange={(e) => setTimetableFilter(e.target.value)}
            className="input w-64"
          >
            <option value="">All Timetables</option>
            {timetables?.data?.map((tt) => (
              <option key={tt.id} value={tt.id}>{tt.name}</option>
            ))}
          </select>
          {timetableFilter && (
            <button
              className="btn-primary"
              onClick={handleRunDetection}
              disabled={detectMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${detectMutation.isPending ? 'animate-spin' : ''}`} />
              Detect Conflicts
            </button>
          )}
          <button className="btn-secondary">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Total Conflicts</p>
              <p className="stat-value">{stats.total}</p>
            </div>
            <div className="stat-icon icon-warning">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Critical</p>
              <p className="stat-value text-red-600">{stats.critical}</p>
            </div>
            <div className="stat-icon icon-danger">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">High</p>
              <p className="stat-value text-orange-600">{stats.high}</p>
            </div>
            <div className="stat-icon icon-warning">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Resolved</p>
              <p className="stat-value text-green-600">{stats.resolved}</p>
            </div>
            <div className="stat-icon icon-success">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Unresolved</p>
              <p className="stat-value text-red-600">{stats.unresolved}</p>
            </div>
            <div className="stat-icon icon-danger">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by description, entity ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-auto sm:w-48"
            >
              <option value="">All Types</option>
              {conflictTypes.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="input w-auto sm:w-40"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto sm:w-32"
            >
              <option value="">All Status</option>
              <option value="resolved">Resolved</option>
              <option value="unresolved">Unresolved</option>
            </select>
            <button className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Conflicts Table */}
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th className="w-12"></th>
                      <th>Type</th>
                      <th>Severity</th>
                      <th>Description</th>
                      <th>Entity</th>
                      <th>Status</th>
                      <th className="w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConflicts.map((conflict) => (
                      <tr key={conflict.id} className={!conflict.isResolved ? 'bg-red-25' : ''}>
                        <td>
                          {showResolution === conflict.id ? (
                            <button onClick={() => setShowResolution(null)} className="p-1 text-gray-500 hover:text-gray-700">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => setShowResolution(conflict.id)} className="p-1 text-gray-500 hover:text-gray-700">
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                        <td>
                          <span className={CONFLICT_TYPE_COLORS[conflict.type]}>
                            {conflict.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td>
                          <span className={SEVERITY_COLORS[conflict.severity]}>
                            {conflict.severity}
                          </span>
                        </td>
                        <td className="max-w-xs">
                          <p className="text-sm text-gray-900 truncate">{conflict.description}</p>
                        </td>
                        <td>
                          <div className="text-sm">
                            <p className="font-medium">{conflict.entityType}: {conflict.entityId}</p>
                            {conflict.relatedEntityType && (
                              <p className="text-xs text-gray-500">
                                vs {conflict.relatedEntityType}: {conflict.relatedEntityId}
                              </p>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={conflict.isResolved ? 'badge-success' : 'badge-danger'}>
                            {conflict.isResolved ? 'Resolved' : 'Unresolved'}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center space-x-2">
                            {renderActions(conflict, handleResolve, showResolution, setShowResolution)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredConflicts.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No conflicts found matching your filters
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resolution Detail Panel */}
      {showResolution && resolutionConflict && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => { setShowResolution(null); setResolutionConflict(null); setResolutionNotes(''); }} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full animate-slide-up max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                <h3 className="text-lg font-semibold">Resolve Conflict</h3>
                <button onClick={() => { setShowResolution(null); setResolutionConflict(null); setResolutionNotes(''); }} className="p-2 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">Conflict Details</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Type:</span> {resolutionConflict.type.replace(/_/g, ' ')}</p>
                    <p><span className="font-medium">Severity:</span> <span className={SEVERITY_COLORS[resolutionConflict.severity]}>{resolutionConflict.severity}</span></p>
                    <p><span className="font-medium">Description:</span> {resolutionConflict.description}</p>
                    <p><span className="font-medium">Entities:</span> {resolutionConflict.entityType}: {resolutionConflict.entityId} vs {resolutionConflict.relatedEntityType}: {resolutionConflict.relatedEntityId}</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-3">Resolution Actions</h4>
                  <div className="space-y-3">
                    <button
                      className={`w-full btn-secondary justify-start ${resolutionConflict.resolutionAction === 'MOVE_EXAM' ? 'border-primary-600 bg-primary-50' : ''}`}
                      onClick={() => setResolutionConflict((prev: any) => ({ ...prev, resolutionAction: 'MOVE_EXAM', resolutionData: {} }))}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l6-6 6 6m0 12l-6-6-6 6" /></svg>
                      Move Exam to Different Time Slot
                    </button>
                    <button
                      className={`w-full btn-secondary justify-start ${resolutionConflict.resolutionAction === 'CHANGE_ROOM' ? 'border-primary-600 bg-primary-50' : ''}`}
                      onClick={() => setResolutionConflict((prev: any) => ({ ...prev, resolutionAction: 'CHANGE_ROOM', resolutionData: {} }))}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      Change Room
                    </button>
                    <button
                      className={`w-full btn-secondary justify-start ${resolutionConflict.resolutionAction === 'CHANGE_TIME' ? 'border-primary-600 bg-primary-50' : ''}`}
                      onClick={() => setResolutionConflict((prev: any) => ({ ...prev, resolutionAction: 'CHANGE_TIME', resolutionData: {} }))}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Reschedule Exam
                    </button>
                    <button
                      className={`w-full btn-secondary justify-start ${resolutionConflict.resolutionAction === 'MANUAL_FIX' ? 'border-primary-600 bg-primary-50' : ''}`}
                      onClick={() => setResolutionConflict((prev: any) => ({ ...prev, resolutionAction: 'MANUAL_FIX', resolutionData: {} }))}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Mark as Resolved (Manual Fix)
                    </button>
                    <button
                      className={`w-full btn-secondary justify-start text-red-600 hover:bg-red-50 ${resolutionConflict.resolutionAction === 'IGNORE' ? 'border-red-600 bg-red-50' : ''}`}
                      onClick={() => setResolutionConflict((prev: any) => ({ ...prev, resolutionAction: 'IGNORE', resolutionData: {} }))}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Ignore Conflict
                    </button>
                  </div>
                </div>

                <div className="p-4 border-t border-gray-200">
                  <label className="block text-sm font-medium mb-2">Resolution Notes</label>
                  <textarea
                    rows={3}
                    className="input"
                    placeholder="Add notes about the resolution..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    className="btn-secondary"
                    onClick={() => { setShowResolution(null); setResolutionConflict(null); setResolutionNotes(''); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleConfirmResolution}
                    disabled={resolveMutation.isPending}
                  >
                    {resolveMutation.isPending ? 'Resolving...' : 'Resolve Conflict'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}