import { Injectable } from "@nestjs/common";

export type HealthResponse = {
  status: "ok";
  service: "acessa-plus-api";
  cycle: "foundation";
};

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return {
      status: "ok",
      service: "acessa-plus-api",
      cycle: "foundation"
    };
  }
}
