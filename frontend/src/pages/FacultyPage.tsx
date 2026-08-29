import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, Download, Filter } from 'lucide-react';
import { facultyApi, departmentApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

const FACULTY_COLUMNS = [
  { key: 'employeeId', header: 'Employee ID' },
  { key: 'name', header: 'Name' },
  { key: 'department', header: 'Department' },
  { key: 'designation', header: 'Designation' },
  { key: 'maxWorkload', header: 'Max Workload' },
  { key: 'actions', header: '' },
];

const renderFacultyRow = (faculty: any, handleEdit: (f: any) => void, handleDelete: (id: string) => void) => (
  <tr key={faculty.id}>
    <td className="font-medium">{faculty.employeeId}</td>
    <td>{faculty.user?.email?.split('@')[0]}</td>
    <td>{faculty.department?.code}</td>
    <td>{faculty.designation}</td>
    <td>{faculty.maxWorkload}</td>
    <td>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleEdit(faculty)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(faculty.id)}
          className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </td>
  </tr>
);

export default function FacultyPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<any>(null);

  const { data: faculty, isLoading } = useQuery({
    queryKey: ['faculty', page, search, departmentFilter],
    queryFn: () => facultyApi.list({ page, limit: 10, search, departmentId: departmentFilter || undefined }),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: facultyApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => facultyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      setShowModal(false);
      setEditingFaculty(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: facultyApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['faculty'] }),
  });

  const handleEdit = (faculty: any) => {
    setEditingFaculty(faculty);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this faculty member?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredFaculty = faculty?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty</h1>
          <p className="text-gray-600 mt-1">Manage faculty records</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingFaculty(null); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Faculty
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by name, ID, or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-10"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
              className="input w-auto"
            >
              <option value="">All Departments</option>
              {departments?.data?.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Max Workload</th>
                      <th className="w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No faculty members found
                        </td>
                      </tr>
                    ) : (
                      filteredFaculty.map((faculty) => (
                        <tr key={faculty.id}>
                          <td className="font-medium">{faculty.employeeId}</td>
                          <td>{faculty.user?.email?.split('@')[0]}</td>
                          <td>{faculty.department?.code}</td>
                          <td>{faculty.designation}</td>
                          <td>{faculty.maxWorkload}</td>
                          <td>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(faculty)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(faculty.id)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, faculty?.meta.total || 0)} of {faculty?.meta.total || 0} results
                </p>
                <div className="flex space-x-2">
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= (faculty?.meta.totalPages || 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => { setShowModal(false); setEditingFaculty(null); }} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full animate-slide-up">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{editingFaculty ? 'Edit Faculty' : 'Add Faculty'}</h3>
                <button onClick={() => { setShowModal(false); setEditingFaculty(null); }} className="p-2 rounded-lg hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); }} className="p-4 space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" required />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input type="password" className="input" required />
                </div>
                <div>
                  <label className="label">Employee ID</label>
                  <input type="text" className="input" required />
                </div>
                <div>
                  <label className="label">Department</label>
                  <select className="input">
                    <option value="">Select Department</option>
                    {departments?.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Designation</label>
                  <select className="input">
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Lecturer">Lecturer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Max Workload</label>
                  <input type="number" className="input" min="1" max="10" defaultValue={4} />
                </div>
                <div className="flex space-x-2 pt-4">
                  <button type="button" className="btn-secondary flex-1" onClick={() => { setShowModal(false); setEditingFaculty(null); }}>Cancel</button>
                  <button type="submit" className="btn-primary flex-1">{editingFaculty ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}