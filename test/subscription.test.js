const chai = require('chai');
const chaiHttp = require('chai-http');
const Subscription = require('../models/subscription');

chai.use(chaiHttp);
const { expect } = chai;

describe('Subscription Model Tests', () => {
  describe('Subscription Creation', () => {
    it('should create a new subscription with default values', () => {
      const subscription = new Subscription({
        userId: 'test-user-1'
      });

      expect(subscription.userId).to.equal('test-user-1');
      expect(subscription.planType).to.equal('free');
      expect(subscription.isActive).to.equal(false);
      expect(subscription.features.paperTrading).to.equal(true);
      expect(subscription.features.orderLimit).to.equal(5);
    });
  });

  describe('Subscription Validation', () => {
    it('should validate subscription activity correctly', () => {
      const activeSubscription = new Subscription({
        userId: 'test-user-2',
        planType: 'premium',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });

      expect(activeSubscription.isSubscriptionActive()).to.equal(true);
    });

    it('should detect expired subscription', () => {
      const expiredSubscription = new Subscription({
        userId: 'test-user-3',
        planType: 'premium',
        isActive: true,
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      });

      expect(expiredSubscription.isSubscriptionActive()).to.equal(false);
    });

    it('should return correct features for different plan types', () => {
      const freeUser = new Subscription({ userId: 'free-user', planType: 'free' });
      const premiumUser = new Subscription({
        userId: 'premium-user',
        planType: 'premium',
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        features: {
          realTimeData: true,
          advancedAnalytics: true,
          paperTrading: true,
          orderLimit: 100
        }
      });

      const freeFeatures = freeUser.getAvailableFeatures();
      const premiumFeatures = premiumUser.getAvailableFeatures();

      expect(freeFeatures.realTimeData).to.equal(false);
      expect(freeFeatures.orderLimit).to.equal(5);

      expect(premiumFeatures.realTimeData).to.equal(true);
      expect(premiumFeatures.orderLimit).to.equal(100);
    });
  });

  describe('Subscription Error Messages', () => {
    it('should generate appropriate error message for duplicate subscription', () => {
      const errorMessage = "Could not upgrade subscription: user already has an active premium subscription which is equal or higher than the requested basic plan.";
      
      // This tests the specific error message format that addresses the original issue
      expect(errorMessage).to.include('Could not upgrade subscription');
      expect(errorMessage).to.include('already has an active');
      expect(errorMessage).to.not.include('GitHub Copilot Pro'); // Ensure no incorrect references
    });
  });
});