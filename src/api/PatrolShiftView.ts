import request from '@/services/apiService';

export default {
    postPatrolShiftView(data: any) {
        return request.post('/PatrolShiftView/getlist', {
            psDay: data.psDay,
            psMonth: data.psMonth,
            psYear: data.psYear
        });
    },
    postBasePatrolShiftView() {
        return request.post('/PatrolShiftView/getbaselist', {});
    }
};