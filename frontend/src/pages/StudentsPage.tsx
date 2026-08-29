import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, Filter, Download } from 'lucide-react';
import { studentApi, departmentApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

const STUDENT_COLUMNS = [
  { key: 'studentId', header: 'Student ID' },
  { key: 'name', header: 'Name' },
  { key: 'department', header: 'Department' },
  { key: 'semester', header: 'Semester' },
  { key: 'section', header: 'Section' },
  { key: 'actions', header: '' },
];

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { data: students, isLoading } = useQuery({
    queryKey: ['students', page, search, departmentFilter],
    queryFn: () => studentApi.list({ page, limit: 10, search, departmentId: departmentFilter || undefined }),
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentApi.list({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: studentApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => studentApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setShowModal(false);
      setEditingStudent(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: studentApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  });

  const handleSubmit = (data: any) => {
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredStudents = students?.data || [];

  const renderStudentRow = (student: any) => (
    <tr key={student.id}>
      <td className="font-medium">{student.studentId}</td>
      <td>{student.user?.email?.split('@')[0]}</td>
      <td>{student.department?.code}</td>
      <td>{student.semester}</td>
      <td>{student.section || '-'}</td>
      <td>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(student)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(student.id)}
            className="p-2 rounded-lg hover:bg-gray-100 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-gray-600 mt-1">Manage student records</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingStudent(null); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
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
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Semester</th>
                      <th>Section</th>
                      <th className="w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No students found
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map(renderStudentRow)
                    )}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, students?.meta.total || 0)} of {students?.meta.total || 0} results
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
                    disabled={page >= (students?.meta.totalPages || 1)}
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
            <div className="fixed inset-0 bg-black/50" onClick={() => { setShowModal(false); setEditingStudent(null); }} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full animate-slide-up">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold">{editingStudent ? 'Edit Student' : 'Add Student'}</h3>
                <button onClick={() => { setShowModal(false); setEditingStudent(null); }} className="p-2 rounded-lg hover:bg-gray-100">
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
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} className="input pr-10" required />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Student ID</label>
                  <input type="text" className="input" required />
                </div>
                <div>
                  <label className="label">Department</label>
                  <select className="input">
                    <option value="">Select Department</option>
                    {departments?.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Semester</label>
                    <select className="input">
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Section</label>
                    <input type="text" className="input" />
                  </div>
                </div>
                <div className="flex space-x-2 pt-4">
                  <button type="button" className="btn-secondary flex-1" onClick={() => { setShowModal(false); setEditingStudent(null); }}>Cancel</button>
                  <button type="submit" className="btn-primary flex-1">{editingStudent ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}