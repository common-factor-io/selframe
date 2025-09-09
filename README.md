# 🎯 Selframe

Frame your mental health journey with intention. An interactive web application for tracking self-care activities and visualizing their impact over time.

## 🌟 Features

### 📊 **Interactive Charts**
- **Composite Curves**: See how all your activities combine to influence mental health
- **Individual Curves**: View the reach and impact of each specific activity
- **3D Visualization**: Explore activities across time, categories, and impact levels

### 📅 **Smart Calendar**
- **Heatmap Mode**: Visualize mental health influence with color-coded days
- **Event Management**: Add, view, and delete activities directly from the calendar
- **Instant Tooltips**: Hover for immediate score breakdowns
- **Detailed Modals**: Double-click any day for complete influence analysis

### 🎯 **Advanced Scoring System**
- **Direct Impact**: Activities provide immediate mental health benefits
- **Reach Effects**: Benefits extend forward in time with realistic decay
- **Hybrid Scoring**: Combines direct events with attenuated reach influences
- **Logarithmic Decay**: Long-term benefits diminish naturally over time

### 💾 **Data Management**
- **Local Storage**: Your data persists between sessions
- **Export/Import**: Backup and restore your activity data
- **Google Calendar Sync**: Two-way synchronization with Google Calendar
- **Dummy Data**: Generate sample data for testing and demonstration

### 📅 **Google Calendar Integration**
- **OAuth Authentication**: Secure connection to your Google account
- **Two-way Sync**: Export Selframe events to Google Calendar and import existing events
- **Calendar Selection**: Choose which Google Calendar to sync with
- **Smart Categorization**: Automatically categorizes imported events
- **Conflict Resolution**: Handles duplicate events intelligently
- **Real-time Status**: Live sync progress and history tracking

## 🚀 **Technology Stack**

- **React 19** with modern hooks
- **Vite** for fast development and building
- **Tailwind CSS** for responsive styling
- **Plotly.js** for interactive data visualizations
- **Google Calendar API** for calendar integration
- **Lucide React** for beautiful icons
- **Local Storage** for data persistence

## 📱 **Usage**

1. **Add Activities**: Use the form to log mental health activities
2. **Set Impact**: Rate activities from 1-10 based on their mental health benefit
3. **Define Reach**: Specify how long the benefits should last (days/weeks/months)
4. **View Calendar**: Switch to calendar view to see your activities over time
5. **Enable Heatmap**: Toggle heatmap mode to visualize mental health influence
6. **Explore Details**: Hover for quick info, double-click for complete breakdowns

## 🎨 **Key Concepts**

### **Mental Health Score Calculation**
- **Direct Events**: Activities on the current day (Impact × 10 = base percentage)
- **Reach Effects**: Influence from past activities with exponential decay
- **Forward-Only**: Benefits only extend into the future, not the past
- **Realistic Decay**: Long reaches have minimal impact at distance

### **Activity Categories**
- **🟣 Therapy**: Professional mental health support
- **🟢 Exercise**: Physical activities that boost mental health  
- **🔵 Quality Time**: Social connections and meaningful relationships

## 🔧 **Development**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 📅 **Google Calendar Setup**

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API" and enable it

3. **Create Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Create "OAuth 2.0 Client ID" and "API Key"
   - Add your domain to authorized origins

4. **Configure Environment**:
   ```bash
   # Copy the example file
   cp env.example .env
   
   # Add your Google credentials to .env
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_GOOGLE_API_KEY=your-api-key
   ```

5. **Deploy Considerations**:
   - Add your production domain to Google OAuth authorized origins
   - Ensure environment variables are set in your deployment platform

## 📈 **Future Enhancements**

- ✅ ~~Google Calendar integration for two-way sync~~ **COMPLETED**
- Advanced analytics and trends
- Goal setting and progress tracking
- Sharing and collaboration features
- Mobile app version
- Recurring event templates
- Team/family sharing capabilities

## 🔗 **Repository**

**GitHub**: [https://github.com/common-factor-io/selframe](https://github.com/common-factor-io/selframe)

---

**Built with ❤️ for intentional mental health and self-awareness.**