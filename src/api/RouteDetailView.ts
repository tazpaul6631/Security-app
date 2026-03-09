import request from '@/services/apiService';

export default {
    postBaseRouteDetailView() {
        return request.post('/RouteDetailView/getbaselist', {});
    }
};