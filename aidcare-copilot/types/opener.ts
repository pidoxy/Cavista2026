export type OpenERIncidentType = 'chest_pain' | 'ob_emergency' | 'trauma' | 'stroke';

export interface OpenERReadinessCard {
  hospital_id: string;
  hospital_name: string;
  distance_km: number;
  eta_minutes: number;
  bed_status: { critical_beds: number };
  specialist_status: {
    required: string[];
    on_seat: string[];
    match: boolean;
  };
  staff_load_status: 'green' | 'amber' | 'red' | string;
  queue_level: number;
  final_score: number;
  reasons: string[];
  last_updated?: string | null;
}

export interface OpenEREmergencyAssessment {
  emergency_id: string;
  incident_type: OpenERIncidentType | string;
  severity_band: 'high' | 'medium' | 'low' | string;
  emergency_summary: string;
  recommended_hospitals: OpenERReadinessCard[];
}

export interface OpenERAlert {
  alert_id: string;
  emergency_id: string;
  hospital_id: string;
  hospital_name: string;
  eta_minutes: number;
  summary: string;
  ack_status: string;
  ack_time: string;
}

export interface OpenERHospital {
  hospital_id: string;
  name: string;
  lat: number;
  lng: number;
  critical_beds: number;
  specialists_on_seat: string[];
  queue_level: number;
  staff_load_status: string;
  last_updated?: string | null;
  notes?: string;
}
