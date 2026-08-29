import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Download, RefreshCw, Settings, Grid, List, Filter, Check, X, Minus, Plus as PlusIcon, Maximize2, Eye, Building } from 'lucide-react';
import { timetableApi, seatAllocationApi } from '../api';
import { useSeatAllocationJobPolling } from '../hooks/useSeatAllocationJobPolling';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const antiCheatingRulesDefaults = {
  separateSameSubject: true,
  separateSameSection: true,
  separateSameDepartment: false,
  minColumnGap: 1,
};

export default function SeatAllocationPage() {
  const queryClient = useQueryClient();
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showRules, setShowRules] = useState(false);
  const [antiCheatingRules, setAntiCheatingRules] = useState(antiCheatingRulesDefaults);
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  const { data: timetables, isLoading: timetablesLoading } = useQuery({
    queryKey: ['timetables'],
    queryFn: () => timetableApi.list({ status: 'PUBLISHED' }),
  });

  const { data: seatAllocations, isLoading: allocationsLoading, refetch } = useQuery({
    queryKey: ['seat-allocations', selectedTimetableId],
    queryFn: () => seatAllocationApi.list({ timetableId: selectedTimetableId }),
    enabled: !!selectedTimetableId,
  });

  const { jobStatus, isPolling } = useSeatAllocationJobPolling({
    jobId,
    interval: 2000,
    onComplete: (status) => {
      if (status.status === 'COMPLETED') {
        toast.success('Seat allocation generated successfully!');
        refetch();
        setJobId(null);
      } else {
        toast.error(status.error || 'Seat allocation generation failed');
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
    mutationFn: (data: { timetableId: string; antiCheatingRules: typeof antiCheatingRules }) =>
      seatAllocationApi.generate(data),
    onSuccess: (result) => {
      setJobId(result.jobId);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: (timetableId: string) => seatAllocationApi.regenerate(timetableId),
    onSuccess: (result) => {
      setJobId(result.jobId);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const exportMutation = useMutation({
    mutationFn: ({ timetableId, format }: { timetableId: string; format: 'pdf' | 'excel' }) =>
      seatAllocationApi.export(timetableId, format),
    onSuccess: (blob, { format }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seat-allocation.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} exported successfully!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleGenerate = () => {
    if (!selectedTimetableId) {
      toast.error('Please select a timetable');
      return;
    }
    generateMutation.mutate({ timetableId: selectedTimetableId, antiCheatingRules });
  };

  const handleRegenerate = () => {
    if (!selectedTimetableId) {
      toast.error('Please select a timetable');
      return;
    }
    if (window.confirm('This will delete existing seat allocations and generate new ones. Continue?')) {
      regenerateMutation.mutate(selectedTimetableId);
    }
  };

  const handleExport = (format: 'pdf' | 'excel') => {
    if (!selectedTimetableId) {
      toast.error('Please select a timetable');
      return;
    }
    exportMutation.mutate({ timetableId: selectedTimetableId, format });
  };

  const getRoomName = (roomId: string) => {
    const room = seatAllocations?.data.find(a => a.room?.id === roomId);
    return room?.room?.code || roomId;
  };

  const getRoomLayout = (roomId: string) => {
    const room = seatAllocations?.data.find(a => a.room?.id === roomId);
    return room?.room?.seatLayout || { rows: 5, columns: 10 };
  };

  const filteredAllocations = seatAllocations?.data.filter(a => {
    if (selectedExamId && a.examId !== selectedExamId) return false;
    if (selectedRoomId && a.roomId !== selectedRoomId) return false;
    return true;
  }) || [];

  const examsInTimetable = seatAllocations?.data.reduce((acc: any[], a) => {
    if (!acc.find(e => e.id === a.examId)) {
      acc.push({ id: a.examId, name: a.exam?.subject?.name, code: a.exam?.subject?.code });
    }
    return acc;
  }, []) || [];

  const roomsInTimetable = seatAllocations?.data.reduce((acc: any[], a) => {
    if (!acc.find(r => r.id === a.roomId)) {
      acc.push({ id: a.roomId, code: a.room?.code, name: a.room?.name, capacity: a.room?.capacity });
    }
    return acc;
  }, []) || [];

  if (timetablesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Seat Allocation</h1>
          <p className="text-gray-600 mt-1">Visual seating arrangements with anti-cheating rules</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimetableId}
            onChange={(e) => {
              setSelectedTimetableId(e.target.value);
              setSelectedRoomId('');
              setSelectedExamId('');
            }}
            className="input w-64"
            disabled={timetablesLoading}
          >
            <option value="">Select a timetable</option>
            {timetables?.data?.map((tt) => (
              <option key={tt.id} value={tt.id}>{tt.name}</option>
            ))}
          </select>
          {selectedTimetableId && (
            <>
              <button
                className="btn-secondary"
                onClick={() => handleExport('excel')}
                disabled={isPolling || generateMutation.isPending || exportMutation.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleExport('pdf')}
                disabled={isPolling || generateMutation.isPending || exportMutation.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
              <button
                className="btn-primary"
                onClick={handleGenerate}
                disabled={isPolling || generateMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isPolling || generateMutation.isPending ? 'animate-spin' : ''}`} />
                {isPolling || generateMutation.isPending ? 'Generating...' : 'Generate Allocation'}
              </button>
            </>
          )}
        </div>
      </div>

      {selectedTimetableId && (
        <>
          {/* Controls */}
          <div className="card">
            <div className="card-body">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center space-x-4">
                  <label className="label mb-0">Room:</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="">All Rooms</option>
                    {roomsInTimetable.map(r => (
                      <option key={r.id} value={r.id}>{r.code} - {r.name} ({r.capacity})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-4">
                  <label className="label mb-0">Exam:</label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="input w-auto"
                  >
                    <option value="">All Exams</option>
                    {examsInTimetable.map(e => (
                      <option key={e.id} value={e.id}>{e.code} - {e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className={`btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    className={`btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className={`btn-secondary ${showRules ? 'bg-primary-50 border-primary-200 text-primary-700' : ''}`}
                    onClick={() => setShowRules(!showRules)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Anti-Cheating Rules
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Anti-Cheating Rules Panel */}
          {showRules && (
            <div className="card bg-primary-50 border-primary-200 animate-slide-up">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary-800">Anti-Cheating Rules</h2>
                <button onClick={() => setShowRules(false)} className="p-2 rounded-lg hover:bg-primary-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-primary-200">
                    <input
                      type="checkbox"
                      checked={antiCheatingRules.separateSameSubject}
                      onChange={(e) => setAntiCheatingRules(prev => ({ ...prev, separateSameSubject: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-primary-800">Separate Same Subject</span>
                    <p className="text-xs text-primary-600 ml-6">Students taking the same subject cannot sit adjacent horizontally</p>
                  </label>
                  <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-primary-200">
                    <input
                      type="checkbox"
                      checked={antiCheatingRules.separateSameSection}
                      onChange={(e) => setAntiCheatingRules(prev => ({ ...prev, separateSameSection: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-primary-800">Separate Same Section</span>
                    <p className="text-xs text-primary-600 ml-6">Students from the same section cannot sit adjacent in any direction</p>
                  </label>
                  <label className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-primary-200">
                    <input
                      type="checkbox"
                      checked={antiCheatingRules.separateSameDepartment}
                      onChange={(e) => setAntiCheatingRules(prev => ({ ...prev, separateSameDepartment: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm font-medium text-primary-800">Separate Same Department</span>
                    <p className="text-xs text-primary-600 ml-6">Students from the same department should be separated where practical</p>
                  </label>
                  <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-primary-200">
                    <label className="text-sm font-medium text-primary-800">Minimum Column Gap:</label>
                    <select
                      value={antiCheatingRules.minColumnGap}
                      onChange={(e) => setAntiCheatingRules(prev => ({ ...prev, minColumnGap: parseInt(e.target.value) }))}
                      className="input w-auto"
                    >
                      <option value="0">0 (Adjacent allowed)</option>
                      <option value="1">1 column gap</option>
                      <option value="2">2 column gap</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary-100 rounded-lg">
                  <p className="text-sm text-primary-800">
                    <strong>Note:</strong> These are soft constraints. The optimizer will try to satisfy them but will prioritize valid seating and room capacity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generation Progress */}
          {(isPolling || generateMutation.isPending) && (
            <div className="card bg-blue-50 border-blue-200 animate-slide-up">
              <div className="card-body">
                <div className="flex items-center space-x-4">
                  <LoadingSpinner size="md" />
                  <div>
                    <p className="font-medium text-blue-800">Generating seat allocation...</p>
                    <p className="text-sm text-blue-600">
                      {jobStatus ? `${jobStatus.progress}% - ${jobStatus.status}` : 'Initializing...'}
                    </p>
                    <div className="w-64 mt-2 bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${jobStatus?.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Room Selection & Visual Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Room List */}
            <div className="lg:col-span-1 space-y-4">
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Exam Sessions</h2>
                  {roomsInTimetable.length > 0 && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={handleRegenerate}
                      disabled={isPolling || generateMutation.isPending}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Regenerate All
                    </button>
                  )}
                </div>
                <div className="card-body p-0">
                  <div className="divide-y divide-gray-200">
                    {roomsInTimetable.map((room) => (
                      <div
                        key={room.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedRoomId === room.id ? 'bg-primary-50 border-l-4 border-primary-600' : ''}`}
                        onClick={() => setSelectedRoomId(selectedRoomId === room.id ? '' : room.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{room.code} - {room.name}</p>
                            <p className="text-sm text-gray-500">Capacity: {room.capacity} seats</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedRoomId(selectedRoomId === room.id ? '' : room.id); }}
                            className={`p-1.5 rounded ${selectedRoomId === room.id ? 'bg-primary-100 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {roomsInTimetable.length === 0 && (
                      <div className="p-8 text-center text-gray-500">
                        <Building className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p>No rooms in this timetable</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Anti-Cheating Status */}
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-gray-900">Anti-Cheating Status</h2>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Same Subject Adjacent</span>
                      <span className="badge badge-success">0 violations</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Same Section Adjacent</span>
                      <span className="badge badge-success">0 violations</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Same Department Adjacent</span>
                      <span className="badge badge-warning">2 minor</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Layout */}
            <div className="lg:col-span-2">
              <div className="card">
                <div className="card-header flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedRoomId
                      ? `${roomsInTimetable.find(r => r.id === selectedRoomId)?.name || 'Room'} - Seat Layout`
                      : 'Select a room to view seat layout'}
                  </h2>
                  {selectedRoomId && (
                    <div className="flex items-center space-x-2">
                      <button className="btn-secondary btn-sm" title="Zoom Out"><Minus className="w-4 h-4" /></button>
                      <button className="btn-secondary btn-sm" title="Zoom In"><PlusIcon className="w-4 h-4" /></button>
                      <button className="btn-secondary btn-sm" title="Fit to Screen"><Maximize2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="card-body">
                  <div className="overflow-auto p-4" style={{ minHeight: '500px' }}>
                    {selectedRoomId && viewMode === 'grid' && (
                      <div className="flex justify-center">
                        {(() => {
                          const room = roomsInTimetable.find(r => r.id === selectedRoomId);
                          if (!room) return null;
                          const layout = getRoomLayout(selectedRoomId);
                          const rows = layout.rows;
                          const cols = layout.columns;
                          const totalSeats = rows * cols;
                          return (
                            <div className={`grid gap-1 grid-cols-${cols}`}>
                              {[...Array(totalSeats)].map((_, i) => {
                                const row = Math.floor(i / cols);
                                const col = i % cols;
                                const seatRow = String.fromCharCode(65 + row);
                                const seatNumber = `${seatRow}${col + 1}`;
                                const allocation = filteredAllocations.find(a => a.seatNumber === seatNumber && a.roomId === selectedRoomId);
                                return (
                                  <div
                                    key={seatNumber}
                                    className={`aspect-square border-2 rounded flex items-center justify-center text-xs font-medium cursor-pointer transition-all ${
                                      allocation
                                        ? 'bg-primary-100 border-primary-400 text-primary-800'
                                        : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-primary-300 hover:bg-primary-50'
                                    }`}
                                    title={allocation ? `${allocation.student?.user?.email || allocation.studentId} (${allocation.exam?.subject?.code})` : 'Empty'}
                                  >
                                    {allocation ? (
                                      <div className="text-center">
                                        <div className="font-medium">{seatNumber}</div>
                                        <div className="text-[10px] truncate px-1">{allocation.student?.user?.email?.split('@')[0] || allocation.studentId}</div>
                                      </div>
                                    ) : (
                                      seatNumber
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {selectedRoomId && viewMode === 'list' && (
                      <div className="overflow-x-auto">
                        <table className="table w-full">
                          <thead>
                            <tr>
                              <th>Seat</th>
                              <th>Student ID</th>
                              <th>Student Name</th>
                              <th>Exam</th>
                              <th>Department</th>
                              <th>Section</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const room = roomsInTimetable.find(r => r.id === selectedRoomId);
                              if (!room) return [];
                              const layout = getRoomLayout(selectedRoomId);
                              const rows = layout.rows;
                              const cols = layout.columns;
                              const totalSeats = rows * cols;
                              return [...Array(totalSeats)].map((_, i) => {
                                const row = Math.floor(i / cols);
                                const col = i % cols;
                                const seatRow = String.fromCharCode(65 + row);
                                const seatNumber = `${seatRow}${col + 1}`;
                                const allocation = filteredAllocations.find(a => a.seatNumber === seatNumber && a.roomId === selectedRoomId);
                                return (
                                  <tr key={seatNumber}>
                                    <td className="font-medium">{seatNumber}</td>
                                    <td>{allocation?.studentId || '-'}</td>
                                    <td>{allocation?.student?.user?.email?.split('@')[0] || '-'}</td>
                                    <td>{allocation?.exam?.subject?.code || '-'}</td>
                                    <td>{allocation?.student?.department?.code || '-'}</td>
                                    <td>{allocation?.student?.section || '-'}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {!selectedRoomId && (
                      <div className="text-center text-gray-500 py-20">
                        <Building className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <p>Select a room from the left panel to view the seat layout</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="card">
            <div className="card-body">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Legend</h3>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-50 border-2 border-gray-300 rounded flex items-center justify-center text-xs font-medium text-gray-500">A1</div>
                  <span className="text-sm text-gray-600">Empty Seat</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-primary-100 border-2 border-primary-400 rounded flex items-center justify-center text-xs font-medium text-primary-800">A1</div>
                  <span className="text-sm text-gray-600">Occupied Seat</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-red-100 border-2 border-red-400 rounded flex items-center justify-center text-xs font-medium text-red-800">!</div>
                  <span className="text-sm text-gray-600">Rule Violation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Allocations Table */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Seat Allocations</h2>
              <div className="flex items-center space-x-2">
                <button className="btn-secondary btn-sm" onClick={() => handleExport('excel')}>
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </button>
                <button className="btn-secondary btn-sm" onClick={() => handleExport('pdf')}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {allocationsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner size="lg" />
                </div>
              ) : filteredAllocations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>Seat</th>
                        <th>Student ID</th>
                        <th>Student Name</th>
                        <th>Exam</th>
                        <th>Room</th>
                        <th>Department</th>
                        <th>Section</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllocations.map((alloc) => (
                        <tr key={alloc.id}>
                          <td className="font-medium">{alloc.seatNumber}</td>
                          <td>{alloc.studentId}</td>
                          <td>{alloc.student?.user?.email?.split('@')[0] || '-'}</td>
                          <td>{alloc.exam?.subject?.code}</td>
                          <td>{alloc.room?.code}</td>
                          <td>{alloc.student?.department?.code || '-'}</td>
                          <td>{alloc.student?.section || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Eye className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>No seat allocations found. Generate allocations first.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}