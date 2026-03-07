import request from '@/services/apiService';

export default {
  postPointReportView() {
    return request.post('/PointReportView/getlist', {});
  },
  postPointReport(id: any) {
    return request.post('/PointReportView/getlist', { cpId: id });
  },
  getPointReportId(id: any) {
    return request.get(`/PointReportView/getone/${id}`);
  },
  createPointReport(data: any) {
    console.log(data);

    return request.post(`/PointReport/create`, {
      psId: data.psId,
      routeId: data.routeId,
      rdId: data.rdId,
      prHasProblem: data.prHasProblem,
      createdAt: data.createdAt,
      prNote: data.prNote || 'Không có vấn đề gì',
      createdBy: data.createdBy,
      scanAt: data.scanAt,
      images: data.images
    })
  }
};