// ============================================================
// FastFree HR — Pinia Store
// ============================================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Employee, Department, Designation, Attendance, LeaveApplication, SalarySlip } from '../types'
import {
  getEmployees,
  getDepartments,
  getDesignations,
  getAttendance,
  getLeaveApplications,
  getSalarySlips,
} from '../services'

export const useHrStore = defineStore('fastfree-hr', () => {
  // ── State ──
  const employees = ref<Employee[]>([])
  const departments = ref<Department[]>([])
  const designations = ref<Designation[]>([])
  const attendance = ref<Attendance[]>([])
  const leaveApplications = ref<LeaveApplication[]>([])
  const salarySlips = ref<SalarySlip[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Helpers ──
  function setLoading(val: boolean) { loading.value = val }
  function setError(e: unknown) { error.value = e instanceof Error ? e.message : e != null ? String(e) : null }

  // ── Fetch actions ──
  async function fetchEmployees() {
    setLoading(true)
    setError(null)
    try {
      const res = await getEmployees()
      if (res.success) {
        employees.value = res.data ?? []
      } else {
        setError(res.error?.message ?? 'Failed to fetch employees')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDepartments() {
    setLoading(true)
    setError(null)
    try {
      const res = await getDepartments()
      if (res.success) {
        departments.value = res.data ?? []
      } else {
        setError(res.error?.message ?? 'Failed to fetch departments')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchDesignations() {
    setLoading(true)
    setError(null)
    try {
      const res = await getDesignations()
      if (res.success) {
        designations.value = res.data ?? []
      } else {
        setError(res.error?.message ?? 'Failed to fetch designations')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchAttendance(date?: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await getAttendance(date)
      if (res.success) {
        attendance.value = res.data ?? []
      } else {
        setError(res.error?.message ?? 'Failed to fetch attendance')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchLeaveApplications() {
    setLoading(true)
    setError(null)
    try {
      const res = await getLeaveApplications()
      if (res.success) {
        leaveApplications.value = res.data ?? []
      } else {
        setError(res.error?.message ?? 'Failed to fetch leave applications')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSalarySlips() {
    setLoading(true)
    setError(null)
    try {
      const res = await getSalarySlips()
      if (res.success) {
        salarySlips.value = res.data ?? []
      } else {
        setError(res.error?.message ?? 'Failed to fetch salary slips')
      }
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  // ── Reset ──
  function $reset() {
    employees.value = []
    departments.value = []
    designations.value = []
    attendance.value = []
    leaveApplications.value = []
    salarySlips.value = []
    loading.value = false
    error.value = null
  }

  return {
    // State
    employees,
    departments,
    designations,
    attendance,
    leaveApplications,
    salarySlips,
    loading,
    error,
    // Actions
    fetchEmployees,
    fetchDepartments,
    fetchDesignations,
    fetchAttendance,
    fetchLeaveApplications,
    fetchSalarySlips,
    $reset,
  }
})
