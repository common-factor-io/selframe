# 🧠 Mental Health Tracker

An interactive web application for tracking mental health activities and visualizing their impact over time.

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
- **Dummy Data**: Generate sample data for testing and demonstration

## 🚀 **Technology Stack**

- **React 19** with modern hooks
- **Vite** for fast development and building
- **Tailwind CSS** for responsive styling
- **Plotly.js** for interactive data visualizations
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

## 📈 **Future Enhancements**

- Google Calendar integration for two-way sync
- Advanced analytics and trends
- Goal setting and progress tracking
- Sharing and collaboration features
- Mobile app version

## 🔗 **Repository**

**GitHub**: [https://github.com/common-factor-io/mental-health-tracker](https://github.com/common-factor-io/mental-health-tracker)

---

**Built with ❤️ for better mental health tracking and awareness.**