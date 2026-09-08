import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Tasks from './pages/Tasks';
import DeadlineWatch from './pages/DeadlineWatch';
import Users from './pages/Users';
import EmployeeStats from './pages/EmployeeStats';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import KanbanBoard from './pages/KanbanBoard';
import CalendarView from './pages/CalendarView';
import Notes from './pages/Notes';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Invoices from './pages/Invoices';
import Expenses from './pages/Expenses';
import Attendance from './pages/Attendance';
import MyAttendance from './pages/MyAttendance';
import Payroll from './pages/Payroll';
import ProtectedRoute from './components/ProtectedRoute';
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Overview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <Tasks />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kanban"
        element={
          <ProtectedRoute>
            <KanbanBoard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <CalendarView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deadlines"
        element={
          <ProtectedRoute>
            <DeadlineWatch />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notes"
        element={
          <ProtectedRoute>
            <Notes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute adminOnly>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee-stats"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <EmployeeStats />
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Leads />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Clients />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:id"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <ClientDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute adminOnly>
            <Invoices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute adminOnly>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-attendance"
        element={
          <ProtectedRoute>
            <MyAttendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <Attendance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <ProtectedRoute adminOnly>
            <Payroll />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Overview />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
