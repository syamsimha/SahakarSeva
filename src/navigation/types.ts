import { Booking } from '../types';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  CustomerRoot: undefined;
  WorkerRoot: undefined;
  AdminRoot: undefined;
};

export type CustomerTabParamList = {
  CustomerHome: undefined;
  CustomerServices: { categoryId?: string };
  CustomerBookings: undefined;
  CustomerNotifications: undefined;
  CustomerProfile: undefined;
};

export type WorkerTabParamList = {
  WorkerHome: undefined;
  WorkerJobs: undefined;
  WorkerRequests: undefined;
  WorkerEarnings: undefined;
  WorkerProfile: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminWorkers: undefined;
  AdminBookings: undefined;
  AdminAnalytics: undefined;
  AdminProfile: undefined;
};
