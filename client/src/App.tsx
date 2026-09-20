import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { STAGE_ONE_ROUTES } from "@shared/stage-one";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import StudentJourneyPage from "./pages/StudentJourney";
import StaffReview from "./pages/StaffReview";

function Router() {
  return (
    <Switch>
      <Route path={STAGE_ONE_ROUTES.landing} component={Home} />
      <Route path={STAGE_ONE_ROUTES.studentHome} component={StudentJourneyPage} />
      <Route path={STAGE_ONE_ROUTES.representativeLesson} component={StudentJourneyPage} />
      <Route path={STAGE_ONE_ROUTES.staffAnalytics} component={StaffReview} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
