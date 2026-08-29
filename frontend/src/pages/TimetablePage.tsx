import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Calendar, Clock, Building, Download, AlertTriangle, CheckCircle, XCircle, ChevronRight, ChevronLeft, RefreshCw, Settings, Save, Eye, Trash2 } from 'lucide-react';
import { timetableApi } from '../api';
import { useJobPolling } from '../hooks/useJobPolling';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const TIMETABLE_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'badge-gray',
  GENERATING: 'badge-warning',
  GENERATED: 'badge-info',
  PUBLISHED: 'badge-success',
  ARCHIVED: 'badge-gray',
};

const generationSteps = [
  { key: 'validating', label: 'Validating', icon: CheckCircle },
  { key: 'checking', label: 'Checking Constraints', icon: AlertTriangle },
  { key: 'optimizing', label: 'Optimizing', icon: Settings },
  { key: 'finalizing', label: 'Finalizing', icon: CheckCircle },
];

const defaultTimeSlots = [
  { type: 'MORNING' as const, start: '09:00', end: '12:00' },
  { type: 'AFTERNOON' as const, start: '13:00', end: '16:00' },
  { type: 'EVENING' as const, start: '17:00', end: '20:00' },
];

export default function TimetablePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'generate' | 'list' | 'view'>('list');
  const [generationStep, setGenerationStep] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    timeSlots: defaultTimeSlots,
    selectedRoomIds: [] as string[],
    selectedExamIds: [] as string[],
    constraints: {
      maxExamsPerDayPerStudent: 2,
      minGapHours: 2,
      invigilatorRatio: 30,
      avoidConsecutiveDays: true,
    },
  });

  const { data: timetables, isLoading, refetch } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => timetableApi.list(),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => import('../api').then(m => m.roomApi.list({ isActive: true })),
  });

  const { data: exams } = useQuery({
    queryKey: ['exams'],
    queryFn: () => import('../api').then(m => m.examApi.list({ status: 'DRAFT' })),
  });

  const { jobStatus, isPolling: isJobPolling } = useJobPolling({
    jobId,
    interval: 2000,
    onComplete: (status) => {
      if (status.status === 'COMPLETED') {
        toast.success('Timetable generated successfully!');
        refetch();
        setActiveTab('list');
        setJobId(null);
      } else {
        toast.error(status.error || 'Timetable generation failed');
        setJobId(null);
      }
    },
    onError: (error) => {
      toast.error(error);
      setJobId(null);
    },
    enabled: !!jobId,
  });

  const generateMutation = useMutation({
    mutationFn: (data: typeof formData) => timetableApi.generate({
      name: data.name,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      timeSlots: data.timeSlots,
      roomIds: data.selectedRoomIds,
      examIds: data.selectedExamIds.length > 0 ? data.selectedExamIds : undefined,
      constraints: data.constraints,
    }),
    onSuccess: (result) => {
      setJobId(result.jobId);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isPolling = isJobPolling || generateMutation.isPending;

  const publishMutation = useMutation({
    mutationFn: (id: string) => timetableApi.publish(id),
    onSuccess: () => {
      toast.success('Timetable published!');
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => timetableApi.regenerate(id),
    onSuccess: (result) => {
      setJobId(result.jobId);
      setActiveTab('generate');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleGenerate = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.selectedRoomIds.length === 0) {
      toast.error('Please select at least one room');
      return;
    }
    setGenerationStep(0);
    generateMutation.mutate(formData);
  };

  const handlePublish = (id: string) => {
    if (window.confirm('Are you sure you want to publish this timetable? This action cannot be undone.')) {
      publishMutation.mutate(id);
    }
  };

  const handleRegenerate = (id: string) => {
    if (window.confirm('This will delete the current timetable entries and generate a new one. Continue?')) {
      regenerateMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this timetable? This action cannot be undone.')) {
      toast.error('Delete not implemented yet');
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Timetable Management</h1>
          <p className="text-gray-600 mt-1">Generate, manage, and publish examination timetables</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn-secondary" disabled={isLoading}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button className="btn-primary" onClick={() => { setActiveTab('generate'); setGenerationStep(0); }}>
            <Plus className="w-4 h-4 mr-2" />
            Generate Timetable
          </button>
        </div>
      </div>

      {/* Generation Wizard Tab */}
      {activeTab === 'generate' && (
        <div className="card animate-slide-up">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Generate Timetable - Step {generationStep + 1} of {generationSteps.length}</h2>
          </div>
          <div className="card-body">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {generationSteps.map((step, index) => (
                  <div key={step.key} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      index < generationStep ? 'bg-primary-600 text-white' :
                      index === generationStep ? 'bg-primary-100 text-primary-700' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <span className={`ml-2 text-sm font-medium ${index <= generationStep ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                    {index < generationSteps.length - 1 && (
                      <div className={`ml-4 w-20 h-1 rounded ${index < generationStep ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            {(isPolling || generateMutation.isPending) && (
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${jobStatus?.progress || (generateMutation.isPending ? 10 : 0)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  {jobStatus?.status === 'PROCESSING' ? `Generating timetable... ${jobStatus.progress}%` : 'Initializing...'}
                </p>
              </div>
            )}

            {/* Step Content */}
            <div className="space-y-6">
              {generationStep === 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Step 1: Select Examination Period</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Timetable Name</label>
                      <input
                        type="text"
                        className="input"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Fall 2024 Final Exams"
                      />
                    </div>
                    <div>
                      <label className="label">Description (Optional)</label>
                      <input
                        type="text"
                        className="input"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description"
                      />
                    </div>
                    <div>
                      <label className="label">Start Date</label>
                      <input
                        type="date"
                        className="input"
                        value={formData.startDate || today}
                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        min={today}
                      />
                    </div>
                    <div>
                      <label className="label">End Date</label>
                      <input
                        type="date"
                        className="input"
                        value={formData.endDate || nextWeek}
                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        min={formData.startDate || today}
                      />
                    </div>
                  </div>
                </div>
              )}
              {generationStep === 1 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Step 2: Configure Time Slots</h3>
                  <div className="space-y-3">
                    {formData.timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked
                          disabled
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{slot.type}</p>
                          <p className="text-sm text-gray-500">{slot.start} - {slot.end} ({((new Date(`2000-01-01T${slot.end}`).getTime() - new Date(`2000-01-01T${slot.start}`).getTime()) / 3600000).toFixed(1)} hours)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Default time slots are used. Customization coming soon.</p>
                </div>
              )}
              {generationStep === 2 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Step 3: Select Rooms</h3>
                  <p className="text-gray-500 mb-4">Select rooms to use for examinations</p>
                  {rooms?.data && rooms.data.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                      {rooms.data.map((room) => (
                        <label key={room.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.selectedRoomIds.includes(room.id)}
                            onChange={() => setFormData(prev => ({
                              ...prev,
                              selectedRoomIds: prev.selectedRoomIds.includes(room.id)
                                ? prev.selectedRoomIds.filter(r => r !== room.id)
                                : [...prev.selectedRoomIds, room.id]
                            }))}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span>{room.code} - {room.name} (Capacity: {room.capacity})</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No active rooms found</p>
                  )}
                </div>
              )}
              {generationStep === 3 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Step 4: Select Exams</h3>
                  <p className="text-gray-500 mb-4">Select exams to include. All exams with registrations are included by default if none selected.</p>
                  {exams?.data && exams.data.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {exams.data.map((exam) => (
                        <label key={exam.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.selectedExamIds.includes(exam.id)}
                            onChange={() => setFormData(prev => ({
                              ...prev,
                              selectedExamIds: prev.selectedExamIds.includes(exam.id)
                                ? prev.selectedExamIds.filter(e => e !== exam.id)
                                : [...prev.selectedExamIds, exam.id]
                            }))}
                            className="w-4 h-4 text-primary-600 rounded"
                          />
                          <span>{exam.subject?.code} - {exam.subject?.name} ({exam._count?.registrations || 0} students)</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No exams found</p>
                  )}
                </div>
              )}
              {generationStep === 4 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Step 5: Optimization Constraints</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Max Exams Per Day Per Student</label>
                      <select
                        className="input w-auto"
                        value={formData.constraints.maxExamsPerDayPerStudent}
                        onChange={(e) => setFormData(prev => ({ ...prev, constraints: { ...prev.constraints, maxExamsPerDayPerStudent: parseInt(e.target.value) } }))}
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Minimum Gap Between Exams (hours)</label>
                      <select
                        className="input w-auto"
                        value={formData.constraints.minGapHours}
                        onChange={(e) => setFormData(prev => ({ ...prev, constraints: { ...prev.constraints, minGapHours: parseInt(e.target.value) } }))}
                      >
                        <option value="0">0 (Back-to-back allowed)</option>
                        <option value="1">1 hour</option>
                        <option value="2">2 hours</option>
                        <option value="3">3 hours</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Invigilator Ratio (students per invigilator)</label>
                      <input
                        type="number"
                        className="input w-auto"
                        value={formData.constraints.invigilatorRatio}
                        onChange={(e) => setFormData(prev => ({ ...prev, constraints: { ...prev.constraints, invigilatorRatio: parseInt(e.target.value) } }))}
                        min="10"
                        max="100"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.constraints.avoidConsecutiveDays}
                        onChange={(e) => setFormData(prev => ({ ...prev, constraints: { ...prev.constraints, avoidConsecutiveDays: e.target.checked } }))}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <label className="text-sm">Avoid consecutive exam days for students</label>
                    </div>
                  </div>
                </div>
              )}
              {generationStep === 5 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Step 6: Review & Generate</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">Summary</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p><span className="font-medium">Name:</span> {formData.name}</p>
                        <p><span className="font-medium">Period:</span> {format(new Date(formData.startDate), 'MMM d, yyyy')} - {format(new Date(formData.endDate), 'MMM d, yyyy')}</p>
                        <p><span className="font-medium">Time Slots:</span> {formData.timeSlots.map(s => s.type).join(', ')}</p>
                        <p><span className="font-medium">Rooms:</span> {formData.selectedRoomIds.length} selected</p>
                        <p><span className="font-medium">Exams:</span> {formData.selectedExamIds.length > 0 ? formData.selectedExamIds.length : 'All (default)'}</p>
                        <p><span className="font-medium">Constraints:</span> Max {formData.constraints.maxExamsPerDayPerStudent}/day, {formData.constraints.minGapHours}hr gap, 1:{formData.constraints.invigilatorRatio} ratio</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => setGenerationStep(p => Math.max(0, p - 1))}
                disabled={generationStep === 0 || isPolling || generateMutation.isPending}
                className="btn-secondary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back
              </button>
              <div className="flex-1" />
              {generationStep < generationSteps.length - 1 ? (
                <button
                  onClick={() => setGenerationStep(p => Math.min(generationSteps.length - 1, p + 1))}
                  disabled={isPolling || generateMutation.isPending}
                  className="btn-primary"
                >
                  Next
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isPolling || generateMutation.isPending}
                  className="btn-primary"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isPolling ? 'animate-spin' : ''}`} />
                  {isPolling ? 'Generating...' : 'Generate Timetable'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timetable List Tab */}
      {activeTab === 'list' && (
        <div className="card animate-slide-up">
          <div className="card-body p-0">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Exams</th>
                    <th>Conflicts</th>
                    <th>Seats</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <LoadingSpinner />
                      </td>
                    </tr>
                  ) : timetables?.data && timetables.data.length > 0 ? (
                    timetables.data.map((tt) => (
                      <tr key={tt.id}>
                        <td className="font-medium">{tt.name}</td>
                        <td>{format(new Date(tt.startDate), 'MMM d')} - {format(new Date(tt.endDate), 'MMM d, yyyy')}</td>
                        <td><span className={TIMETABLE_STATUS_COLORS[tt.status]}>{tt.status}</span></td>
                        <td>{tt._count?.entries || 0}</td>
                        <td>{tt._count?.conflicts && tt._count.conflicts > 0 ? (
                          <span className="badge badge-danger">{tt._count.conflicts}</span>
                        ) : (
                          <span className="badge badge-success">0</span>
                        )}</td>
                        <td>{tt._count?.seatAllocations || 0}</td>
                        <td>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setActiveTab('view')}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {tt.status === 'GENERATED' && (
                              <button
                                onClick={() => handlePublish(tt.id)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-green-600"
                                title="Publish"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {(tt.status === 'GENERATED' || tt.status === 'DRAFT') && (
                              <button
                                onClick={() => handleRegenerate(tt.id)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-blue-600"
                                title="Regenerate"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(tt.id)}
                              className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No timetables found. Click "Generate Timetable" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View Tab */}
      {activeTab === 'view' && timetables?.data && (
        <div className="card animate-slide-up">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Timetable View</h2>
            <div className="flex items-center space-x-2">
              <select
                className="input w-auto"
                value={timetables.data[0]?.id || ''}
                onChange={(e) => console.log('View timetable:', e.target.value)}
              >
                {timetables.data.map((tt) => (
                  <option key={tt.id} value={tt.id}>{tt.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="aspect-square border border-gray-200 rounded-lg p-1 min-h-[100px] relative">
                  <div className="text-xs text-gray-400">{i + 1}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-500 mt-4">Select a timetable from the list to view its calendar.</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        {[
          { key: 'list', label: 'Timetables', icon: Calendar },
          { key: 'view', label: 'Calendar View', icon: Calendar },
          { key: 'generate', label: 'Generate', icon: Plus },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}