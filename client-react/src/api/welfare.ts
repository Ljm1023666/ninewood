import api from "./index";

export const welfareApi = {
  list(params?: { page?: number }) {
    return api.get("/welfare/demands", { params });
  },
  createDemand(data: {
    title: string;
    description: string;
    expectedOutcome: string;
    minPrice: number;
    regionId?: number;
  }) {
    return api.post("/welfare/demands", data);
  },
  claim(demandId: string) {
    return api.post(`/welfare/claim/${demandId}`);
  },
  complete(
    demandId: string,
    data: { finalPrice: number; rewardMode: "random" | "choice"; choiceLabel?: string },
  ) {
    return api.post(`/welfare/complete/${demandId}`, data);
  },
  rewards(params?: { page?: number }) {
    return api.get("/welfare/rewards", { params });
  },
  fundPool(regionId: number | string) {
    return api.get(`/welfare/fund-pool/${regionId}`);
  },
};
