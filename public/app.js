const form = document.getElementById('booking');
const fleetGrid = document.getElementById('fleetGrid');
const statusBox = document.getElementById('status');
const dialog = document.getElementById('customerDialog');
const customerForm = document.getElementById('customerForm');
const selectedSummary = document.getElementById('selectedSummary');
const closeButton = document.querySelector('.icon-close');

let currentSearch = {};
let selectedVehicle = null;
let currentLang = localStorage.getItem('blueRentalLang') || 'en';
let statusState = { key: 'selectDates', type: 'normal' };
const apiBase = location.protocol === 'file:' ? 'http://localhost:4317' : '';

const money = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD'
});

const i18n = {
  en: {
    title: 'Blue Rental | Affordable Car Rentals in New Zealand',
    nav: ['About', 'Reviews', 'Vehicles', 'Locations', 'Insurance', 'Rental Info', 'Support'],
    headerAction: 'Book Now',
    heroEyebrow: 'Christchurch & South Island Car Hire',
    heroTitle: 'Explore New Zealand with Blue Rental',
    heroCopy: 'Find the best cars for your journey. Affordable, well-maintained vehicles for city errands, South Island road trips and business travel.',
    labels: ['Pick-up location', 'Drop-off location', 'Pick-up date', 'Pick-up time', 'Drop-off date', 'Drop-off time'],
    locations: ['Hornby Office', 'CHC Airport', 'Christchurch City', 'ZQN Airport'],
    searchButton: 'Search Vehicles',
    trust: [
      ['3000+', 'Positive reviews across the web'],
      ['$35', 'NZD/day starting price'],
      ['9:30-5', 'Open daily, excluding public holidays'],
      ['CHC', 'Airport shuttle pick-up and drop-off']
    ],
    about: {
      eyebrow: 'About Us - Blue Rental',
      title: 'Your trusted partner for high-quality car rentals',
      copy: 'Blue Rental is based in Christchurch, New Zealand and focuses on value, reliability and a stress-free rental experience for travellers exploring the South Island or customers needing a vehicle for business.',
      cards: [
        ['Well-maintained vehicles', 'A practical fleet for compact city driving, hybrid economy, family travel, business use and premium SUV bookings.'],
        ['Friendly service team', 'Helpful local support from booking to pick-up, with clear communication and practical travel advice.'],
        ['Online booking discount', 'Book online and enjoy up to 25% off. T&C apply.']
      ]
    },
    reviews: {
      eyebrow: 'Customer Reviews',
      title: '3000+ positive reviews across online platforms',
      copy: 'Travellers consistently highlight helpful service, clean vehicles, easy pick-up and good value for South Island trips.',
      items: [
        ['Wonderful staff', 'Helpful service from booking through pick-up.'],
        ['Clean, reliable cars', 'Well-presented vehicles for city and road-trip travel.'],
        ['Easy airport shuttle', 'Convenient Christchurch Airport pick-up and drop-off.'],
        ['Great value', 'Affordable daily rates with practical vehicle options.'],
        ['Friendly support', 'Clear communication and helpful local advice.'],
        ['Smooth booking', 'Simple process, transparent pricing and quick confirmation.']
      ]
    },
    fleet: {
      eyebrow: 'Our Vehicles',
      title: 'Budget cars, hybrids, SUVs and family options',
      copy: 'The demo fleet now mirrors the vehicle categories listed on the current Blue Rental website. Live availability and pricing can be supplied by Rental Car Manager once the sandbox credentials are added.'
    },
    locationsSection: {
      eyebrow: 'Locations',
      title: 'Christchurch base with airport support',
      cards: [
        ['CHC APT', 'Christchurch Airport', 'Free shuttle pick-up and drop-off is available for Christchurch Airport bookings.'],
        ['Hornby', '249 Main South Rd', 'Blue Rental is based at 249 Main South Rd, Hornby, Christchurch 8042, New Zealand.'],
        ['ZQN APT', 'Queenstown Airport', 'Queenstown Airport service is shown as in progress on the current website and can be enabled once operations are ready.']
      ]
    },
    process: {
      eyebrow: 'Online Booking',
      title: 'A clearer booking flow for Blue Rental',
      cards: [
        ['01', 'Search availability', 'The website sends location and date details to the backend, which can query RCM for live fleet availability.'],
        ['02', 'Confirm customer details', 'The customer chooses a vehicle, enters their name, email and phone, then a pending booking is created.'],
        ['03', 'Pay a 10% deposit online', 'Windcave PxPay collects a 10% deposit securely, then the paid status can be written back to RCM.']
      ]
    },
    rentalInfo: {
      eyebrow: 'Rental Info',
      title: 'Clear information before customers book',
      insuranceLink: 'View insurance options',
      cards: [
        ['Terms & Conditions', 'Add your licence, age, bond, fuel, cancellation and late return rules here so customers can review them before checkout.'],
        ['Insurance Option', 'Show standard cover, excess reduction options and any daily insurance pricing returned by Rental Car Manager.'],
        ['Pick-up and Drop-off', 'Explain Hornby office collection, airport shuttle steps, after-hours instructions and what customers need to bring.'],
        ['Online Deposit', 'Customers can pay 10% of the order amount online through Windcave PxPay, while the remaining balance can be due on pick-up.']
      ]
    },
    support: {
      eyebrow: 'About Blue Rental',
      title: 'Value, reliability and stress-free travel',
      items: [
        'Based in Christchurch, New Zealand',
        'Vehicles for South Island journeys and business use',
        'Phone: 03 281 8858',
        'Email: info@bluerental.co.nz',
        'Friendly local support',
        'Monday - Sunday, 9:30am - 5:00pm',
        'Excluding public holidays',
        '249 Main South Rd Hornby, Christchurch 8042'
      ]
    },
    dialog: {
      eyebrow: 'Secure Booking',
      title: 'Confirm booking and pay 10% deposit',
      labels: ['Name', 'Email', 'Phone'],
      placeholders: ['Full name', 'name@example.com', '+64'],
      finePrint: 'Payments are handled by Windcave PxPay. In demo mode, this redirects to a simulated success page.'
    },
    buttons: {
      bookDeposit: 'Book and Pay 10% Deposit',
      creating: 'Creating booking...',
      opening: 'Opening payment...'
    },
    status: {
      selectDates: 'Select your dates to search available vehicles.',
      searching: 'Searching available Blue Rental vehicles...',
      dateError: 'Drop-off date and time must be later than pick-up date and time.',
      rcm: 'Live vehicles returned from Rental Car Manager.',
      demo: 'Demo Blue Rental inventory is showing now. Add RCM API credentials to switch to live availability.'
    },
    vehicle: {
      seats: 'seats',
      luggage: 'luggage',
      recent: 'Recent model',
      daysTotal: 'days total',
      from: 'from',
      depositToday: '10% deposit today',
      total: 'Total',
      deposit: 'Deposit',
      connector: 'to',
      perDay: 'day'
    }
  },
  zh: {
    title: 'Blue Rental | 新西兰实惠租车',
    nav: ['关于我们', '客户评价', '车辆', '取还车地点', '保险', '租车信息', '客服支持'],
    headerAction: '立即预订',
    heroEyebrow: '基督城与南岛租车',
    heroTitle: '和 Blue Rental 一起探索新西兰',
    heroCopy: '为你的旅程选择合适车辆。我们提供实惠、维护良好的车辆，适合城市通勤、南岛自驾和商务用车。',
    labels: ['取车地点', '还车地点', '取车日期', '还车日期'],
    locations: ['Hornby 门店', '基督城机场', '基督城市区', '皇后镇机场'],
    searchButton: '查询车辆',
    trust: [
      ['3000+', '全网客户好评'],
      ['$35', 'NZD/天起'],
      ['9:30-5', '每日营业，公众假期除外'],
      ['CHC', '机场免费 shuttle 取还车']
    ],
    about: {
      eyebrow: '关于 Blue Rental',
      title: '值得信赖的高品质租车伙伴',
      copy: 'Blue Rental 位于新西兰基督城，专注于为南岛旅行、城市用车和商务出行提供高性价比、可靠、轻松省心的租车体验。',
      cards: [
        ['维护良好的车辆', '从经济小车、混动车，到家庭用车、商务车型和高端 SUV，满足不同出行需求。'],
        ['中文客服支持', '提供中文沟通支持，让预订、取车、还车和行程咨询更清楚、更安心。'],
        ['支持线上预订', '在保留原官网风格的基础上，加入实时库存接口、RCM 对接点和 10% 线上定金支付。']
      ]
    },
    reviews: {
      eyebrow: '客户评价',
      title: '全网 3000+ 客户好评',
      copy: '客户常提到服务热情、车辆干净可靠、取还车方便，以及南岛自驾性价比高。',
      items: [
        ['员工服务很好', '从预订到取车都有清楚、友好的协助。'],
        ['车辆干净可靠', '车辆状态良好，适合城市用车和长途自驾。'],
        ['机场取还车方便', '基督城机场 shuttle 取还车流程更省心。'],
        ['价格实惠', '日租价格友好，车型选择实用。'],
        ['客服沟通顺畅', '沟通清楚，并提供中文语言支持。'],
        ['预订流程顺利', '流程简单、价格透明、确认速度快。']
      ]
    },
    fleet: {
      eyebrow: '我们的车辆',
      title: '经济车、混动车、SUV 与家庭车型',
      copy: '演示车队已参考当前 Blue Rental 官网车辆类别。接入 Rental Car Manager sandbox 后，可展示实时库存与报价。'
    },
    locationsSection: {
      eyebrow: '取还车地点',
      title: '基督城门店与机场支持',
      cards: [
        ['CHC APT', '基督城机场', '基督城机场订单可提供免费 shuttle 取车和还车服务。'],
        ['Hornby', '249 Main South Rd', 'Blue Rental 位于 249 Main South Rd, Hornby, Christchurch 8042, New Zealand。'],
        ['ZQN APT', '皇后镇机场', '皇后镇机场服务目前显示为筹备中，运营准备好后可在网站中启用。']
      ]
    },
    process: {
      eyebrow: '线上预订',
      title: '更清晰的 Blue Rental 预订流程',
      cards: [
        ['01', '查询可租车辆', '网站将地点和日期提交给后端，后端可连接 RCM 查询实时车队库存。'],
        ['02', '确认客户资料', '客户选择车辆后填写姓名、邮箱和电话，系统创建待支付定金的预订单。'],
        ['03', '线上支付 10% 定金', '安全的线上加密支付，收取订单金额 10% 定金，锁定您的车辆。']
      ]
    },
    rentalInfo: {
      eyebrow: '租车信息',
      title: '预订前清楚了解关键信息',
      insuranceLink: '查看保险选项',
      cards: [
        ['租车条款', '可在这里补充驾照、年龄、押金、油量、取消政策和逾期还车规则。'],
        ['保险选项', '展示基础保险、降低垫底费选项，以及 RCM 返回的每日保险价格。'],
        ['取车与还车', '说明 Hornby 门店取车、机场 shuttle 步骤、非营业时间说明和客户需携带的资料。'],
        ['线上定金', '客户可通过 Windcave PxPay 线上支付订单金额 10% 定金，余款可在取车时支付。']
      ]
    },
    support: {
      eyebrow: '关于 Blue Rental',
      title: '高性价比、可靠、省心的出行体验',
      items: [
        '位于新西兰基督城',
        '适合南岛旅行和商务用车',
        '电话：03 281 8858',
        '邮箱：info@bluerental.co.nz',
        '提供中文客服支持',
        '周一至周日 9:30am - 5:00pm',
        '公众假期除外',
        '249 Main South Rd Hornby, Christchurch 8042'
      ]
    },
    dialog: {
      eyebrow: '安全预订',
      title: '确认预订并支付 10% 定金',
      labels: ['姓名', '邮箱', '电话'],
      placeholders: ['姓名', 'name@example.com', '+64'],
      finePrint: '付款由 Windcave PxPay 处理。演示模式下会跳转到模拟成功页面。'
    },
    buttons: {
      bookDeposit: '预订并支付 10% 定金',
      creating: '正在创建预订...',
      opening: '正在进入付款页面...'
    },
    status: {
      selectDates: '请选择日期查询可租车辆。',
      searching: '正在查询 Blue Rental 可租车辆...',
      dateError: '还车日期必须晚于取车日期。',
      rcm: '已从 Rental Car Manager 返回实时车辆。',
      demo: '当前显示 Blue Rental 演示库存；填入 RCM API 密钥后会切换为实时库存。'
    },
    vehicle: {
      seats: '座',
      luggage: '件行李',
      recent: '较新车型',
      daysTotal: '天总价',
      from: '起价',
      depositToday: '今日支付 10% 定金',
      total: '总价',
      deposit: '定金',
      connector: '至',
      perDay: '天'
    }
  }
};

const vehicleText = {
  zh: {
    'budget-vitz': {
      name: 'Toyota Vitz 或同级',
      category: '经济车型',
      badge: '$35 NZD/天起',
      transmission: '自动挡',
      fuel: '汽油',
      description: '紧凑、省油，适合城市驾驶和注重预算的旅行者。'
    },
    'eco-spade': {
      name: 'Toyota Spade 或同级',
      category: '节能车型',
      badge: '滑门设计',
      transmission: '自动挡',
      fuel: '汽油',
      description: '紧凑但空间实用，滑门方便上下车，适合城市出行和小家庭。'
    },
    'compact-aqua': {
      name: 'Toyota Aqua 或同级',
      category: '紧凑车型',
      badge: '混合动力',
      transmission: '自动挡',
      fuel: '混合动力',
      description: '省油混动车，油耗约 3.9L/100km，适合南岛自驾和环保出行。'
    },
    'intermediate-corolla': {
      name: 'Toyota Corolla 或同级',
      category: '中级车型',
      badge: '舒适实用',
      transmission: '自动挡',
      fuel: '汽油',
      description: '适合长途驾驶和日常用车，舒适度与行李空间更均衡。'
    },
    'wagon-fielder': {
      name: 'Corolla Fielder 或同级',
      category: '旅行车',
      badge: '更多行李空间',
      transmission: '自动挡',
      fuel: '汽油',
      description: '适合需要更多行李空间的客户，例如家庭、球包或长途旅行装备。'
    },
    'sedan-camry': {
      name: 'Toyota Camry 或同级',
      category: '轿车',
      badge: '商务舒适',
      transmission: '自动挡',
      fuel: '汽油',
      description: '平稳舒适，适合商务出行、机场接送和长途公路驾驶。'
    },
    'seven-seater-vellfire': {
      name: 'Toyota Vellfire 或同级',
      category: '7 座车型',
      badge: '多人出行',
      transmission: '自动挡',
      fuel: '汽油',
      description: '宽敞多人座，适合家庭和团队探索基督城及周边地区。'
    },
    'suv-cx5': {
      name: 'Mazda CX-5 或同级',
      category: 'SUV',
      badge: 'SUV',
      transmission: '自动挡',
      fuel: '汽油',
      description: '适合长途自驾、家庭旅行和更舒适的南岛行程。'
    },
    'luxury-suv-q7': {
      name: 'Audi Q7 或同级',
      category: '豪华 SUV',
      badge: '高端车型',
      transmission: '自动挡',
      fuel: '汽油',
      description: '高端 SUV，适合商务接待、多人出行和更多行李需求。'
    }
  }
};

i18n.en.heroCopy = 'Find the best car for your journey. Affordable, well-maintained vehicles for city errands, South Island road trips and business travel.';
i18n.en.locations = ['Christchurch', 'Queenstown'];
i18n.en.trust = [
  ['3000+', 'Positive reviews across the web and still growing'],
  ['$35', 'NZD/day starting price'],
  ['9.30am-5pm', 'Public holiday surcharge may apply'],
  ['Free shuttle', 'Between the airport and our branch']
];
i18n.en.about.cards[2] = ['Online booking discount', 'Book online and enjoy up to 25% off. T&C apply.'];
i18n.en.fleet = {
  eyebrow: 'Our Vehicles',
  title: 'Super eco, compact, sedans, wagons, SUVs and luxury SUVs',
  copy: 'We offer super eco, compact, middle size sedan, wagon, SUVs, 4x4 and luxury SUVs for different travel needs.'
};
i18n.en.locationsSection = {
  eyebrow: 'Pick-up and Drop-off Locations',
  title: 'Branch and airport support',
  cards: [
    ['CHC APT', 'Christchurch Airport', 'Christchurch Airport bookings include a free shuttle transfer to our branch.'],
    ['Hornby', '249 Main South Rd', 'Blue Rental is based at 249 Main South Rd, Hornby, Christchurch 8042, New Zealand.'],
    ['ZQN APT', 'Queenstown Airport', 'Queenstown Airport service is in preparation, coming soon.']
  ]
};
i18n.en.process = {
  eyebrow: 'Online Booking',
  title: 'A clearer Blue Rental booking flow',
  cards: [
    ['01', 'Search vehicles', 'Enter your location and dates, then submit to check fleet availability.'],
    ['02', 'Fill in details', 'Choose a vehicle, then enter your name, email and phone to create a booking request.'],
    ['03', 'Pay 10% deposit online', 'Secure encrypted online payment collects 10% of the order amount and locks in your vehicle.'],
    ['04', 'Pick up and start your journey', 'Arrive at the branch, complete pick-up and begin your trip.']
  ]
};
i18n.en.vehicle.depositToday = '10% deposit today';

i18n.zh.heroCopy = '为你的旅程选择合适车辆。我们提供实惠、维护良好的车辆，适合城市通勤、南岛自驾和商务用车。';
i18n.zh.locations = ['基督城', '皇后镇'];
i18n.zh.trust = [
  ['3000+', '全网客户好评，持续增长'],
  ['$35', 'NZD/天起'],
  ['9.30am-5pm', '公共假期 surcharge may apply'],
  ['免费机场 shuttle', '穿梭在机场和门店之间']
];
i18n.zh.about.cards[2] = ['线上预订享折扣', '线上预定享折扣最高 25% off，T&C apply。'];
i18n.zh.fleet = {
  eyebrow: '我们的车辆',
  title: 'Super eco、compact、sedan、wagon、SUV 与豪华 SUV',
  copy: '我们提供 super eco，compact，middle size sedan，wagon，SUVs，4x4 and luxury SUVs，满足不同旅行和用车需求。'
};
i18n.zh.locationsSection = {
  eyebrow: '取还车地点',
  title: '门店与机场支持',
  cards: [
    ['CHC APT', '基督城机场', '基督城机场可提供免费 shuttle 接送到门店。'],
    ['Hornby', '249 Main South Rd', 'Blue Rental 位于 249 Main South Rd, Hornby, Christchurch 8042, New Zealand。'],
    ['ZQN APT', '皇后镇机场', '皇后镇机场服务目前筹备中，coming soon。']
  ]
};
i18n.zh.process = {
  eyebrow: '线上预订',
  title: '更清晰的 Blue Rental 预订流程',
  cards: [
    ['01', '查询可租车辆', '输入地点和日期然后提交，查询车队库存。'],
    ['02', '填写资料', '选择车辆后填写姓名、邮箱和电话，创建预订单。'],
    ['03', '线上支付 10% 定金', '安全的线上加密支付，收取订单金额 10% 定金，锁定您的车辆。'],
    ['04', '到达门店取车开始旅程', '到达门店完成取车流程，开始您的新西兰旅程。']
  ]
};
i18n.zh.labels = ['取车地点', '还车地点', '取车日期', '取车时间', '还车日期', '还车时间'];

vehicleText.en = {
  'budget-vitz': {
    category: 'Super Eco',
    badge: 'From $35 NZD/day',
    description: 'A compact, fuel-efficient choice for city driving and budget-conscious travellers.'
  },
  'eco-spade': {
    category: 'Eco Model',
    description: 'A compact yet spacious hatchback with easy access for city travel and small families.'
  },
  'compact-aqua': {
    category: 'Compact',
    description: 'A fuel-saving hybrid, ideal for South Island road trips and eco-conscious travel.'
  },
  'intermediate-corolla': {
    name: 'Toyota Corolla Hatch or similar',
    category: 'Intermediate',
    description: 'A practical hatchback for daily rental, longer drives and easy luggage loading.'
  },
  'wagon-fielder': {
    category: 'Wagon',
    description: 'A wagon option with more luggage space for families, longer trips and travel gear.'
  },
  'sedan-camry': {
    category: 'Middle Size Sedan',
    description: 'A smooth sedan for business travel, airport transfers and comfortable open-road driving.'
  },
  'seven-seater-vellfire': {
    category: '7 Seater',
    description: 'A spacious option for groups and families heading beyond Christchurch.'
  },
  'suv-cx5': {
    category: 'SUV',
    description: 'A versatile SUV for longer road trips, family travel and comfortable touring.'
  },
  'luxury-suv-q7': {
    category: 'Luxury SUV',
    description: 'A premium SUV for executive travel, larger groups and extra luggage capacity.'
  }
};

Object.assign(vehicleText.zh['budget-vitz'], {
  category: 'Super Eco',
  badge: '$35 NZD/天起',
  description: '紧凑省油，适合城市驾驶和注重预算的旅行者。'
});
Object.assign(vehicleText.zh['eco-spade'], {
  category: 'Eco Model',
  description: '紧凑但空间实用，上下车方便，适合城市出行和小家庭。'
});
Object.assign(vehicleText.zh['compact-aqua'], {
  category: 'Compact',
  description: '省油混动车，适合南岛自驾和环保出行。'
});
Object.assign(vehicleText.zh['intermediate-corolla'], {
  name: 'Toyota Corolla Hatch 或同级',
  category: 'Intermediate',
  description: '舒适实用的中型轿车，适合日常租车、长途驾驶和商务用车。'
});
Object.assign(vehicleText.zh['wagon-fielder'], {
  category: 'Wagon',
  description: '旅行车行李空间更充足，适合家庭、长途旅行和较多装备。'
});
Object.assign(vehicleText.zh['sedan-camry'], {
  category: 'Middle Size Sedan',
  description: '平稳舒适，适合商务出行、机场接送和长途公路驾驶。'
});
Object.assign(vehicleText.zh['seven-seater-vellfire'], {
  category: '7 Seater',
  description: '宽敞多人座，适合家庭和团队从基督城开启旅程。'
});
Object.assign(vehicleText.zh['suv-cx5'], {
  category: 'SUV',
  description: '适合长途自驾、家庭旅行和更舒适的南岛行程。'
});
Object.assign(vehicleText.zh['luxury-suv-q7'], {
  category: 'Luxury SUV',
  description: '高端 SUV，适合商务接待、多人出行和更多行李需求。'
});

function tr() {
  return i18n[currentLang];
}

function timeOptions() {
  const options = [];
  for (let minutes = 9 * 60 + 30; minutes <= 17 * 60; minutes += 30) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    const minute = String(minutes % 60).padStart(2, '0');
    options.push(`${hour}:${minute}`);
  }
  return options;
}

function populateTimeSelects() {
  document.querySelectorAll('[data-time-select]').forEach((select) => {
    const selectedValue = select.value || select.dataset.defaultTime;
    select.innerHTML = timeOptions().map((value) => `<option value="${value}">${value}</option>`).join('');
    select.value = selectedValue && timeOptions().includes(selectedValue) ? selectedValue : select.dataset.defaultTime;
  });
}

function setDefaultDates() {
  if (!form) return;
  const today = new Date();
  const pickup = new Date(today);
  pickup.setDate(today.getDate() + 2);
  const dropoff = new Date(today);
  dropoff.setDate(today.getDate() + 6);
  form.elements.pickupDate.value = pickup.toISOString().slice(0, 10);
  form.elements.returnDate.value = dropoff.toISOString().slice(0, 10);
  if (form.elements.pickupTime && !form.elements.pickupTime.value) form.elements.pickupTime.value = '09:30';
  if (form.elements.returnTime && !form.elements.returnTime.value) form.elements.returnTime.value = '09:30';
}

function applySearchParams() {
  if (!form) return;
  const params = new URLSearchParams(location.search);
  ['pickupLocation', 'returnLocation', 'pickupDate', 'pickupTime', 'returnDate', 'returnTime'].forEach((key) => {
    const value = params.get(key);
    if (value && form.elements[key]) form.elements[key].value = value;
  });
}

function formDataToObject(formElement) {
  return Object.fromEntries(new FormData(formElement).entries());
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value;
}

function setLabelText(label, value) {
  const firstNode = label.childNodes[0];
  if (firstNode?.nodeType === Node.TEXT_NODE) {
    firstNode.textContent = `${value}\n            `;
  }
}

function setStatusKey(key, type = 'normal') {
  statusState = { key, type };
  if (!statusBox) return;
  statusBox.textContent = tr().status[key];
  statusBox.classList.toggle('error', type === 'error');
}

function setStatusText(message, type = 'normal') {
  statusState = { text: message, type };
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.classList.toggle('error', type === 'error');
}

function localizeVehicle(vehicle) {
  const translated = vehicleText[currentLang]?.[vehicle.id] || {};
  return { ...vehicle, ...translated };
}

function renderReviews() {
  const reviews = [...tr().reviews.items, ...tr().reviews.items];
  const track = document.querySelector('.review-track');
  if (!track) return;
  track.innerHTML = reviews.map(([title, copy]) => `
    <article><strong>${title}</strong><span>${copy}</span></article>
  `).join('');
}

function applyLanguage() {
  const t = tr();
  document.documentElement.lang = currentLang === 'zh' ? 'zh-Hans' : 'en-NZ';
  document.title = t.title;

  document.querySelectorAll('[data-lang-toggle]').forEach((button) => {
    button.classList.toggle('active', button.dataset.langToggle === currentLang);
  });

  document.querySelectorAll('nav a').forEach((link, index) => {
    link.textContent = t.nav[index];
  });

  setText('.header-action', t.headerAction);
  setText('.hero .eyebrow', t.heroEyebrow);
  setText('.hero h1', t.heroTitle);
  setText('.hero-copy', t.heroCopy);
  setText('.booking-panel .button', t.searchButton);

  document.querySelectorAll('.booking-panel label').forEach((label, index) => {
    setLabelText(label, t.labels[index]);
  });
  document.querySelectorAll('.booking-panel select[name$="Location"]').forEach((select) => {
    const selectedIndex = Math.max(0, select.selectedIndex);
    select.innerHTML = t.locations.map((location) => `<option>${location}</option>`).join('');
    select.selectedIndex = Math.min(selectedIndex, t.locations.length - 1);
  });

  document.querySelectorAll('.trust-strip div').forEach((item, index) => {
    item.querySelector('strong').textContent = t.trust[index][0];
    item.querySelector('span').textContent = t.trust[index][1];
  });

  setText('#about .eyebrow', t.about.eyebrow);
  setText('#about h2', t.about.title);
  setText('#about .section-heading p:last-child', t.about.copy);
  document.querySelectorAll('#about article').forEach((article, index) => {
    article.querySelector('h3').textContent = t.about.cards[index][0];
    article.querySelector('p').textContent = t.about.cards[index][1];
  });

  setText('#reviews .eyebrow', t.reviews.eyebrow);
  setText('#reviews h2', t.reviews.title);
  setText('#reviews .review-intro p:last-child', t.reviews.copy);
  renderReviews();

  setText('#fleet .eyebrow', t.fleet.eyebrow);
  setText('#fleet h2', t.fleet.title);
  setText('#fleet .section-heading p:last-child', t.fleet.copy);

  setText('#locations .eyebrow', t.locationsSection.eyebrow);
  setText('#locations h2', t.locationsSection.title);
  document.querySelectorAll('#locations article').forEach((article, index) => {
    article.querySelector('.location-code').textContent = t.locationsSection.cards[index][0];
    article.querySelector('h3').textContent = t.locationsSection.cards[index][1];
    article.querySelector('p').textContent = t.locationsSection.cards[index][2];
  });

  setText('#process .eyebrow', t.process.eyebrow);
  setText('#process h2', t.process.title);
  document.querySelectorAll('#process article').forEach((article, index) => {
    article.querySelector('span').textContent = t.process.cards[index][0];
    article.querySelector('h3').textContent = t.process.cards[index][1];
    article.querySelector('p').textContent = t.process.cards[index][2];
  });

  setText('[data-admin-payments-link]', t.rentalInfo.eyebrow);
  setText('#rental-info h2', t.rentalInfo.title);
  document.querySelectorAll('#rental-info article').forEach((article, index) => {
    article.querySelector('h3').textContent = t.rentalInfo.cards[index][0];
    article.querySelector('p').textContent = t.rentalInfo.cards[index][1];
  });
  setText('[data-insurance-link]', t.rentalInfo.insuranceLink);

  setText('#support .eyebrow', t.support.eyebrow);
  setText('#support h2', t.support.title);
  document.querySelectorAll('#support li').forEach((item, index) => {
    item.textContent = t.support.items[index];
  });

  setText('#customerDialog .eyebrow', t.dialog.eyebrow);
  setText('#customerDialog h2', t.dialog.title);
  document.querySelectorAll('#customerDialog label').forEach((label, index) => {
    setLabelText(label, t.dialog.labels[index]);
    label.querySelector('input').placeholder = t.dialog.placeholders[index];
  });
  setText('#customerDialog button[type="submit"]', t.buttons.bookDeposit);
  setText('#customerDialog .fine-print', t.dialog.finePrint);

  if (statusState.key) setStatusKey(statusState.key, statusState.type);
  if (window.latestVehicles) renderFleet(window.latestVehicles);
}

function renderFleet(vehicles) {
  if (!fleetGrid) return;
  window.latestVehicles = vehicles;
  const t = tr();
  fleetGrid.innerHTML = vehicles.map((baseVehicle) => {
    const vehicle = localizeVehicle(baseVehicle);
    return `
      <article class="vehicle-card">
        <img src="${vehicle.image}" alt="${vehicle.name}">
        <div class="vehicle-body">
          <div class="vehicle-top">
            <div>
              <p class="eyebrow">${vehicle.category}</p>
              <h3>${vehicle.name}</h3>
            </div>
            <span class="badge">${vehicle.badge || 'Available'}</span>
          </div>
          <div class="specs" aria-label="Vehicle specs">
            <span>${vehicle.seats} ${t.vehicle.seats}</span>
            <span>${vehicle.bags} ${t.vehicle.luggage}</span>
            <span>${vehicle.transmission}</span>
            <span>${vehicle.fuel}</span>
            <span>${vehicle.years || t.vehicle.recent}</span>
          </div>
          <p class="vehicle-description">${vehicle.description || ''}</p>
          <div class="price-row">
            <div>
              <div class="price">${money.format(vehicle.total)}</div>
              <small>${vehicle.days} ${t.vehicle.daysTotal}, ${t.vehicle.from} ${money.format(vehicle.dailyRate)}/${t.vehicle.perDay}</small>
            </div>
            <div class="deposit">${money.format(vehicle.deposit)}<br><small>${t.vehicle.depositToday}</small></div>
          </div>
          <button class="button primary" type="button" data-book="${vehicle.id}">${t.buttons.bookDeposit}</button>
        </div>
      </article>
    `;
  }).join('');
}

async function postJson(url, data) {
  const response = await fetch(`${apiBase}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Request failed');
  return payload;
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    currentSearch = formDataToObject(form);

    if (!fleetGrid || !statusBox) {
      const params = new URLSearchParams(currentSearch);
      window.location.href = `./vehicles.html?${params.toString()}#fleet`;
      return;
    }

    const pickupDateTime = new Date(`${currentSearch.pickupDate}T${currentSearch.pickupTime || '00:00'}`);
    const returnDateTime = new Date(`${currentSearch.returnDate}T${currentSearch.returnTime || '00:00'}`);
    if (returnDateTime <= pickupDateTime) {
      setStatusKey('dateError', 'error');
      return;
    }

    setStatusKey('searching');
    fleetGrid.innerHTML = '';

    try {
      const result = await postJson('/api/availability', currentSearch);
      renderFleet(result.vehicles);
      setStatusKey(result.source === 'rcm' ? 'rcm' : 'demo');
    } catch (error) {
      setStatusText(error.message, 'error');
    }
  });
}

if (fleetGrid) fleetGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-book]');
  if (!button) return;

  const vehicleCards = [...fleetGrid.querySelectorAll('[data-book]')];
  const index = vehicleCards.indexOf(button);
  selectedVehicle = window.latestVehicles?.[index];
  const vehicle = localizeVehicle(selectedVehicle);
  const t = tr();

  selectedSummary.innerHTML = [
    `<strong>${vehicle.name}</strong>`,
    `${currentSearch.pickupLocation} ${t.vehicle.connector} ${currentSearch.returnLocation}`,
    `${currentSearch.pickupDate} ${currentSearch.pickupTime || ''} - ${currentSearch.returnDate} ${currentSearch.returnTime || ''}`,
    `${t.vehicle.total} ${money.format(vehicle.total)} / ${t.vehicle.deposit} ${money.format(vehicle.deposit)}`
  ].join('<br>');
  dialog.showModal();
});

if (customerForm) customerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!selectedVehicle) return;

  const customer = formDataToObject(customerForm);
  const submitButton = customerForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = tr().buttons.creating;

  try {
    const booking = await postJson('/api/bookings', {
      search: currentSearch,
      vehicle: selectedVehicle,
      customer
    });

    submitButton.textContent = tr().buttons.opening;
    const payment = await postJson('/api/pay-deposit', {
      bookingId: booking.bookingId,
      vehicleName: selectedVehicle.name,
      total: selectedVehicle.total,
      deposit: selectedVehicle.deposit,
      customerEmail: customer.email
    });

    window.location.href = payment.checkoutUrl;
  } catch (error) {
    setStatusText(error.message, 'error');
    dialog.close();
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = tr().buttons.bookDeposit;
  }
});

document.querySelectorAll('[data-lang-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    currentLang = button.dataset.langToggle;
    localStorage.setItem('blueRentalLang', currentLang);
    applyLanguage();
  });
});

if (closeButton && dialog) closeButton.addEventListener('click', () => dialog.close());

populateTimeSelects();
setDefaultDates();
applySearchParams();
applyLanguage();
if (form?.dataset.autoSearch === 'true') form.requestSubmit();
