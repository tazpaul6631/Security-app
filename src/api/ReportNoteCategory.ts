import request from '@/services/apiService';

export default {
    getReportNoteCategory() {
        return request.get(`/ReportNoteCategory/gettreedata`);
    }
};