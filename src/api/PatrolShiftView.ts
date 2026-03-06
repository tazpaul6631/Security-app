import request from '@/services/apiService';

export default {
    postPatrolShiftView(data: any) {
        return request.post('/PatrolShiftView/getbaselist', {
            psDay: data.psDay,
            psMonth: data.psMonth,
            psYear: data.psYear
        });
    }
};